import React, { useEffect, useState } from 'react';
import './AnimatedCredits.css';

const names = [
  'Andreas',
  'Arnav',
  'Vedant',
  'Ryan',
  'Kent'
];

const AnimatedCredits = () => {
  const [index, setIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % names.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    console.log('Theme toggle clicked! Current mode:', isDarkMode);
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Toggle body class for global theme switching
    if (newMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      console.log('Switched to dark theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      console.log('Switched to light theme');
    }
    
    // Store preference in localStorage
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    console.log('Theme preference saved:', newMode ? 'dark' : 'light');
  };

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      setIsDarkMode(true);
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }, []);

  return (
    <div className="credits-container">
      <div className="powered-by-ai">
        Powered by <span className="ai-text">AI</span>
        <span className="ai-dots">
          <span className="ai-dot"></span>
          <span className="ai-dot"></span>
          <span className="ai-dot"></span>
        </span>
      </div>
      
      {/* Theme Toggle Button */}
      <div className="theme-toggle-container">
        <div className="theme-toggle-switch">
          <input 
            type="checkbox" 
            id="theme-toggle" 
            className="theme-toggle-input"
            checked={isDarkMode}
            onChange={toggleTheme}
          />
          <label htmlFor="theme-toggle" className="theme-toggle-label">
            <span className="theme-toggle-text">Light</span>
            <span className="theme-toggle-text">Dark</span>
            <span className="theme-toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div className="home-credits">
        By: <span className="credit-name-rahul">Rahul</span>,<span className="credit-name-fade credit-name-pulse">{names[index]}</span>
      </div>
    </div>
  );
};

export default AnimatedCredits; 