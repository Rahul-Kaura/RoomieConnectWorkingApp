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
    setView('welcome');
  };

  const handleStartChat = (match) => {
    // For now, show an alert with match info instead of going to chatbot
    alert(`Starting chat with ${match.name}!\n\nThis would open a chat window in a real app.\n\nMatch details:\n- Compatibility: ${match.compatibilityScore}%\n- Major: ${match.major}\n- Bio: ${match.bio || 'No bio available'}`);
  };

  const handleOpenSettings = () => {
    // In a real app, you would navigate to a settings page
    setView('settings'); // Assuming a 'settings' view exists
  };

  const handleProfileComplete = (profile) => {
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));
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
      case 'homeLoading':
        return (
          <div className="home-page screen-transition" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0fffe 0%, #e6fffa 100%)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Login/Sign Up Button - Top Right */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 1000
            }}>
              {isAuthenticated ? (
                <button
                  className="home-auth-button"
                  onClick={handleLogout}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#20b2aa',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '2px solid #20b2aa',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(32, 178, 170, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#20b2aa';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.target.style.color = '#20b2aa';
                  }}
                >
                  Log Out
                </button>
              ) : (
                <button
                  className="home-auth-button"
                  onClick={() => setView('login')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#20b2aa',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '2px solid #20b2aa',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(32, 178, 170, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#20b2aa';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.target.style.color = '#20b2aa';
                  }}
                >
                  Login / Sign Up
                </button>
              )}
            </div>

            {/* Main Content */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              {/* Logo */}
              <div className="home-logo-container" style={{
                marginBottom: '30px',
                animation: 'bounceLogo 2.5s cubic-bezier(.68,-0.55,.27,1.55) infinite'
              }}>
                <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="25,70 70,25 115,70" stroke="#6366f1" strokeWidth="6" fill="none" />
                  <rect x="35" y="70" width="70" height="45" rx="10" stroke="#6366f1" strokeWidth="6" fill="none" />
                  <path d="M50 95 Q70 100 90 95" stroke="#6366f1" strokeWidth="4" fill="none" />
                  <circle cx="45" cy="80" r="5" fill="#6366f1" />
                  <circle cx="95" cy="80" r="5" fill="#6366f1" />
                </svg>
              </div>
              
              {/* Title */}
              <h1 style={{
                color: '#6366f1',
                fontSize: '48px',
                fontWeight: '700',
                margin: '0 0 20px 0',
                letterSpacing: '1px',
                lineHeight: '1.2'
              }}>
                ROOMIE<br/>CONNECT
              </h1>
              
              {/* Subtitle */}
              <p style={{
                color: '#20b2aa',
                fontSize: '20px',
                margin: '0 0 40px 0',
                fontWeight: '400',
                maxWidth: '600px'
              }}>
                Find your perfect roommate match
              </p>

              {/* Get Started Button */}
              {!isAuthenticated && (
                <button
                  onClick={() => setView('login')}
                  style={{
                    padding: '15px 40px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    background: 'linear-gradient(135deg, #6366f1 0%, #20b2aa 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                    marginTop: '20px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
                  }}
                >
                  Get Started
                </button>
              )}

              {/* Welcome message for authenticated users */}
              {isAuthenticated && user && (
                <div style={{ marginTop: '30px' }}>
                  <p style={{
                    color: '#6366f1',
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '20px'
                  }}>
                    Welcome back, {getDisplayName()}!
                  </p>
                  <button
                    onClick={handleWelcomeContinue}
                    style={{
                      padding: '15px 40px',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'white',
                      background: 'linear-gradient(135deg, #6366f1 0%, #20b2aa 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
                    }}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
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
          onStartChat={handleStartChat} 
          currentUser={currentUser} 
          onResetToHome={resetToHome} 
          onOpenSettings={handleOpenSettings}
        />;
      case 'welcome':
      default:
        return (
          <div>
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

export default App;