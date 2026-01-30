import React, { useRef } from 'react';
import AnimatedCredits from './AnimatedCredits';

const RoomieLogo = () => (
  <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="25,70 70,25 115,70" stroke="#6366f1" strokeWidth="6" fill="none" />
    <rect x="35" y="70" width="70" height="45" rx="10" stroke="#6366f1" strokeWidth="6" fill="none" />
    <path d="M50 95 Q70 100 90 95" stroke="#6366f1" strokeWidth="4" fill="none" />
    <circle cx="45" cy="80" r="5" fill="#6366f1" />
    <circle cx="95" cy="80" r="5" fill="#6366f1" />
  </svg>
);

function HomePage({ isAuthenticated, getDisplayName, onLogin, onLogout, onContinue }) {
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const bookDemoRef = useRef(null);
  const howItWorksRef = useRef(null);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="home-page custom-loading-screen screen-transition home-page-fullscreen"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0a0a0a',
        color: '#20b2aa',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Top bar: nav centered, Log In / Log Out right – same height */}
      <div className="home-page-top-bar">
        <nav className="home-page-nav home-page-nav-top">
          <button className="home-nav-button" onClick={() => scrollTo(aboutRef)}>About the Team</button>
          <button className="home-nav-button" onClick={() => scrollTo(contactRef)}>Contact</button>
          <button className="home-nav-button" onClick={() => scrollTo(bookDemoRef)}>Book a Demo</button>
          <button className="home-nav-button" onClick={() => scrollTo(howItWorksRef)}>How It Works</button>
        </nav>
        <div className="home-page-auth">
          {isAuthenticated ? (
            <button className="home-nav-button home-auth-button" onClick={onLogout}>
              Log Out
            </button>
          ) : (
            <button className="home-nav-button home-auth-button" onClick={onLogin}>
              Log In
            </button>
          )}
        </div>
      </div>

      {/* Hero: logo + content (floating dots kept in loading-particles below) */}
      <div className="roomie-loading-container home-page-hero-area" style={{ flex: 1, minHeight: 0 }}>
        {/* Central Logo with rotating rings (same as loading screen) */}
        <div className="loading-logo-container">
          <div className="loading-logo">
            <RoomieLogo />
          </div>
          <div className="loading-ring" />
          <div className="loading-ring-2" />
        </div>

        {/* Powered by AI – in flow so it scrolls with the page */}
        <div className="home-page-powered-by-ai">
          Powered by <span className="home-page-ai-text">AI</span>
          <span className="home-page-ai-dots">
            <span className="home-page-ai-dot" />
            <span className="home-page-ai-dot" />
            <span className="home-page-ai-dot" />
          </span>
        </div>

        {/* Title/subtitle - same classes and colors as loading screen */}
        <div className="loading-text-container">
          <h1 className="loading-title">ROOMIE CONNECT</h1>
          <div className="loading-subtitle">
            <span className="loading-dots">Find your perfect roommate match</span>
          </div>
        </div>

        {isAuthenticated && (
          <div className="home-page-continue">
            <p className="home-page-welcome">Welcome back, {getDisplayName()}!</p>
            <button className="home-cta-button" onClick={onContinue}>
              Continue
            </button>
          </div>
        )}
      </div>

      {/* Sections - same text colors as loading screen */}
      <section ref={aboutRef} className="home-page-section home-page-section-loading">
        <h2 className="home-section-title">About the Team</h2>
        <p className="home-section-text">
          We're a team dedicated to helping students and young professionals find compatible roommates through smart matching and a smooth experience.
        </p>
      </section>
      <section ref={contactRef} className="home-page-section home-page-section-loading">
        <h2 className="home-section-title">Contact</h2>
        <p className="home-section-text">
          Get in touch: support@roomieconnect.com or reach out through our app.
        </p>
      </section>
      <section ref={bookDemoRef} className="home-page-section home-page-section-loading">
        <h2 className="home-section-title">Book a Demo</h2>
        <p className="home-section-text">
          See RoomieConnect in action. Schedule a demo for your campus or organization.
        </p>
      </section>
      <section ref={howItWorksRef} className="home-page-section home-page-section-loading">
        <h2 className="home-section-title">How It Works</h2>
        <p className="home-section-text">
          Answer a few questions about your preferences, and we'll match you with compatible roommates. Chat, compare, and find your perfect fit.
        </p>
      </section>

      {/* Spacer so fixed credits don't overlap last section */}
      <div className="home-page-credits-spacer" aria-hidden="true" />

      {/* Background particles – decorative only, behind content */}
      <div className="loading-particles home-page-particles" aria-hidden="true">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      <AnimatedCredits />
    </div>
  );
}

export default HomePage;
