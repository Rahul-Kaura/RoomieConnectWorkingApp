import React from 'react';
import './AnimatedCredits.css';

const AnimatedCredits = ({ theme = 'dark', onThemeChange }) => {
  const isDarkMode = theme === 'dark';

  const handleClick = () => {
    if (typeof onThemeChange === 'function') {
      onThemeChange();
    } else {
      // Fallback if used without App context: toggle body class and localStorage
      const nextTheme = isDarkMode ? 'light' : 'dark';
      document.body.classList.toggle('light-theme', nextTheme === 'light');
      document.body.classList.toggle('dark-theme', nextTheme === 'dark');
      try {
        localStorage.setItem('theme', nextTheme);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('themechange', { detail: nextTheme }));
    }
  };

  return (
    <div className="credits-container credits-container-top-left">
      <div className="theme-toggle-container">
        <button
          type="button"
          className={`theme-toggle-button ${isDarkMode ? 'theme-toggle-dark' : 'theme-toggle-light'}`}
          onClick={handleClick}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDarkMode}
        >
          <span className="theme-toggle-text">Light</span>
          <span className="theme-toggle-text">Dark</span>
          <span className="theme-toggle-slider" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default AnimatedCredits; 