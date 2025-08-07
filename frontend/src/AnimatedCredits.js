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

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % names.length);
    }, 3000);
    return () => clearInterval(interval);
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
      <div className="home-credits">
        By: <span className="credit-name-rahul">Rahul</span>,<span className="credit-name-fade credit-name-pulse">{names[index]}</span>
      </div>
    </div>
  );
};

export default AnimatedCredits; 