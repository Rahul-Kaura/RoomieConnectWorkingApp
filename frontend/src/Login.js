import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Login.css';

const Login = ({ onContinue }) => {
    const { loginWithRedirect, logout, isAuthenticated, user, isLoading, error } = useAuth0();

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="login-container">
            <div className="login-header">
                <h2>RoomieConnect</h2>
            </div>
            {error && <p className="login-error">{error.message}</p>}
            {isAuthenticated ? (
                <>
                    <div className="login-user-info">
                        <p>Welcome, {user.name || user.email}!</p>
                        <button className="login-button" onClick={onContinue}>
                            Continue
                        </button>
                    </div>
                    <button
                        className="logout-corner-button"
                        onClick={() => logout({ returnTo: window.location.origin })}
                        style={{ position: 'fixed', bottom: 20, right: 20, fontSize: 12, padding: '6px 12px', borderRadius: 16, background: '#eee', color: '#333', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                    >
                        Log Out
                    </button>
                </>
            ) : (
                <button className="login-button" onClick={() => loginWithRedirect()}>
                    Log In / Register
                </button>
            )}
        </div>
    );
};

export default Login; 