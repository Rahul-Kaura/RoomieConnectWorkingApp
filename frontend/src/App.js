import React, { useState, useEffect } from 'react';
import Chatbot from './Chatbot';
import Login from './Login';
import './App.css';
import AnimatedCredits from './AnimatedCredits';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { loadProfile, monitorNewProfiles, stopListeningToProfiles } from './services/firebaseProfile';
import { testMessagingSetup } from './testMessaging';
import { autoSyncTestProfiles } from './services/syncTestProfiles';

function App() {
  const { isAuthenticated, user, isLoading, logout } = useAuth0();
  const [view, setView] = useState('homeLoading'); // Start with home loading animation
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [globalProfileMonitor, setGlobalProfileMonitor] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadingStartTime, setProfileLoadingStartTime] = useState(null);

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

  // Test messaging setup and start fresh when app loads
  useEffect(() => {
    // Run messaging test and start fresh after a short delay to ensure Firebase is initialized
    const timer = setTimeout(async () => {
      testMessagingSetup();
      
      // Start completely fresh - no test profiles
      try {
        await autoSyncTestProfiles();
      } catch (error) {
        console.error('Error during fresh start:', error);
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
        // Start loading screen with minimum 6.5 seconds
        setView('loading');
        
        // Calculate dynamic loading time based on profile loading performance
        const startTime = Date.now();
        const minLoadingTime = 6500; // 6.5 seconds minimum
        
        // Check if profile is still loading from Firebase/backend
        const checkProfileLoading = () => {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
          
          if (remainingTime > 0) {
            // Still need to wait for minimum time
            setTimeout(() => {
              // Check if profile is still loading when minimum time is met
              if (isProfileLoading) {
                // Profile still loading, extend by additional time
                const extendedTime = 3000; // Add 3 more seconds for ongoing profile operations
                console.log(`🔄 Profile still loading, extending by ${extendedTime}ms`);
                setTimeout(() => {
                  setView('matches');
                }, extendedTime);
              } else {
                // Profile loading complete, go to matches
                setView('matches');
              }
            }, remainingTime);
          } else {
            // Minimum time met, check if we should extend for profile sync
            if (isProfileLoading) {
              // Profile still loading, extend for additional time
              const extendedTime = 3000; // Add 3 more seconds
              console.log(`🔄 Extending loading by ${extendedTime}ms for ongoing profile operations`);
              setTimeout(() => {
                setView('matches');
              }, extendedTime);
            } else {
              // No sync needed, go to matches immediately
              setView('matches');
            }
          }
        };
        
        // Start the dynamic loading timer
        checkProfileLoading();
        
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

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const resetToHome = () => {
    setView('welcome');
  };

  const renderContent = () => {
    if (isLoading) return (
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
    );
    
    switch (view) {
      case 'homeLoading':
        return (
          <div className="home-loading-screen screen-transition" onClick={() => setView('welcome')} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #f0fffe 0%, #e6fffa 100%)',
            color: '#20b2aa',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer'
          }}>
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
          <div className="loading-screen screen-transition" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#6366f1',
            position: 'relative'
          }}>
            {/* Awwwards-inspired UI transition animation */}
            <div className="loading-spinner-cool">
              <div className="loading-ui-screens">
                {/* Screen 1: Chatbot Interface */}
                <div className="loading-screen-card loading-screen-1">
                  <div className="loading-screen-content">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      💬
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                      Complete your profile
                    </div>
                  </div>
                </div>

                {/* Screen 2: Profile Setup */}
                <div className="loading-screen-card loading-screen-2">
                  <div className="loading-screen-content">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      👤
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                      Building your profile
                    </div>
                  </div>
                </div>

                {/* Screen 3: Matches Preview */}
                <div className="loading-screen-card loading-screen-3">
                  <div className="loading-screen-content">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
              fontSize: '24px', 
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      🏠
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                      Finding perfect matches
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="loading-progress-bar">
                <div className="loading-progress-fill"></div>
              </div>
            </div>

            <p className="loading-text">
              Connecting you to your perfect roommates...
            </p>
            
            {/* Dynamic loading indicator */}
            {isProfileLoading && (
              <div style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                🔄 Syncing profile data...
              </div>
            )}
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
          />
        );
      case 'matches':
        return <Chatbot currentUser={currentUser} existingProfile={userProfile} onResetToHome={resetToHome} onUpdateUser={handleUpdateUser} />;
      case 'welcome':
      default:
        return (
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
  return (
    <Auth0Provider
      domain="dev-s2103new01u1y2di.us.auth0.com"
      clientId="drjmUYWyCnE4JOZZdcpmax2D5m2HmeAt"
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <App />
    </Auth0Provider>
  );
}