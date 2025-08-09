import React, { useState, useEffect } from 'react';
import Chatbot from './Chatbot';
import Login from './Login';
import './App.css';
import AnimatedCredits from './AnimatedCredits';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { loadProfile } from './services/firebaseProfile';
import { testMessagingSetup } from './testMessaging';

function App() {
  const { isAuthenticated, user, isLoading, logout } = useAuth0();
  const [view, setView] = useState('welcome'); // welcome, chatbot, matches, loading
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

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
      setView('welcome');
    }
  }, [isAuthenticated, user]);

  // Check for profile in Firebase when currentUser changes
  useEffect(() => {
    if (currentUser) {
      console.log('=== PROFILE LOADING DEBUG ===');
      console.log('Loading profile for user ID:', currentUser.id);
      console.log('Current user object:', currentUser);
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
        console.log('=== END PROFILE LOADING DEBUG ===');
      })();
    }
  }, [currentUser]);

  // Test messaging setup when app loads
  useEffect(() => {
    // Run messaging test after a short delay to ensure Firebase is initialized
    const timer = setTimeout(() => {
      testMessagingSetup();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleWelcomeContinue = () => {
    console.log('=== WELCOME CONTINUE DEBUG ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('userProfile exists:', !!userProfile);
    console.log('userProfile:', userProfile);
    
    if (isAuthenticated) {
      if (userProfile) {
        console.log('✅ User has profile, going to matches view');
        // Show loading screen for 2 seconds, then go to matches
        setView('loading');
        setTimeout(() => {
          setView('matches');
        }, 2000);
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
    logout({ returnTo: window.location.origin });
    setCurrentUser(null);
    setUserProfile(null);
    setView('welcome');
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
    if (isLoading) return <div>Loading...</div>;
    
    switch (view) {
      case 'loading':
        return (
          <div className="loading-screen screen-transition" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#f5f5f5',
            color: '#20b2aa'
          }}>
            <div className="loading-spinner-cool"></div>
            <p className="loading-text" style={{ 
              marginTop: '50px', 
              fontSize: '24px', 
              color: '#666', 
              fontWeight: '500',
              textAlign: 'center'
            }}>
              Loading your matches...
            </p>
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
                  <polyline points="20,55 55,20 90,55" stroke="#20b2aa" strokeWidth="5" fill="none" />
                  <rect x="28" y="55" width="54" height="35" rx="8" stroke="#20b2aa" strokeWidth="5" fill="none" />
                  <path d="M55 85
                    C 55 80, 40 75, 40 65
                    A 8 8 0 0 1 55 65
                    A 8 8 0 0 1 70 65
                    C 70 75, 55 80, 55 85
                    Z" stroke="#20b2aa" strokeWidth="3" fill="none" />
                </svg>
            </div>
            <h1 className="home-title">ROOMIE<br/>CONNECT</h1>
            <p className="home-subtitle">Click anywhere to start</p>
            {isAuthenticated && user && (
              <p className="welcome-back-message">Welcome Back, {localStorage.getItem('userName') || user.name || user.email}</p>
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