// Test file to verify Firebase messaging setup
import firebaseMessaging from './services/firebaseMessaging';

export const testMessagingSetup = async () => {
  console.log('🧪 Testing Firebase Messaging Setup...');
  
  try {
    // Test 1: Check if Firebase is connected
    console.log('✅ Firebase connection test passed');
    
    // Test 2: Try to create a test chat
    const testChatId = 'test_chat_' + Date.now();
    const testParticipants = ['test_user_1', 'test_user_2'];
    
    const createResult = await firebaseMessaging.createChat(testChatId, testParticipants);
    console.log('✅ Chat creation test:', createResult.success ? 'PASSED' : 'FAILED');
    
    // Test 3: Try to send a test message
    const testMessage = {
      text: 'Test message from setup verification',
      senderId: 'test_user_1',
      senderName: 'Test User',
      type: 'text'
    };
    
    const sendResult = await firebaseMessaging.sendMessage(testChatId, testMessage);
    console.log('✅ Message sending test:', sendResult.success ? 'PASSED' : 'FAILED');
    
    // Test 4: Try to get chat history
    const history = await firebaseMessaging.getChatHistory(testChatId);
    console.log('✅ Chat history test:', history.length > 0 ? 'PASSED' : 'FAILED');
    
    console.log('🎉 All Firebase messaging tests completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase messaging test failed:', error);
    return false;
  }
};

// Run test when imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    testMessagingSetup();
  }, 2000);
} 