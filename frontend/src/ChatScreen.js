import React from 'react';
import FirebaseChat from './FirebaseChat';
import './ChatScreen.css';

const ChatScreen = ({ currentUser, matchedUser, onBack }) => {
  return (
    <div className="chat-screen-container">
      <FirebaseChat 
        currentUser={currentUser}
        matchedUser={matchedUser}
        onClose={onBack}
      />
    </div>
  );
};

export default ChatScreen; 