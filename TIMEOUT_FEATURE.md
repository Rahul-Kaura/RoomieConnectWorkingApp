# 5-Second AI Response Timeout Feature

## Overview
Added a 5-second timeout mechanism to detect when the AI is not responding and automatically fall back to predefined questions to keep the conversation flowing.

## How It Works

### 1. Timeout Wrapper Function
Created `callGeminiWithTimeout()` that wraps the AI API call:
- Races between the actual API call and a 5-second timeout
- If API responds first: Returns the AI-generated response
- If timeout occurs first: Returns a timeout error
- User experience remains smooth regardless of AI availability

### 2. User-Facing Timeout Messages

**During Initial Response:**
- Shows: "⏰ The AI is taking longer than expected to respond. I'll use a quick question instead to keep things moving!"
- Immediately follows with a fallback question

**During Final Analysis:**
- Shows: "⏰ The AI is taking longer than expected. No worries, I'll create your profile with the information you've shared!"
- Proceeds with profile creation using fallback content

### 3. Fallback Questions
When timeout occurs, the chatbot uses one of these pre-written questions:
1. "That's interesting! Can you tell me more about your study habits and how you prefer to spend your evenings?"
2. "Thanks for sharing! What about your cleanliness preferences - are you someone who likes things very organized or more relaxed?"
3. "Great to know! How would you describe your social style - do you prefer quiet nights in or are you more outgoing?"
4. "Interesting! What are your thoughts on having guests over and noise levels in your living space?"

## Technical Implementation

### Code Changes in `Chatbot.js`

#### New Function: `callGeminiWithTimeout`
```javascript
const callGeminiWithTimeout = async (messages, systemPrompt, timeoutMs = 5000) => {
    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
            resolve({ 
                success: false, 
                error: 'timeout',
                message: 'AI response timed out after 5 seconds' 
            });
        }, timeoutMs);
    });

    const apiPromise = callGeminiAPI(messages, systemPrompt);
    return await Promise.race([apiPromise, timeoutPromise]);
};
```

#### Updated Functions
1. **`handleUserResponse`**: Now uses `callGeminiWithTimeout` instead of `callGeminiAPI`
2. **`handleFollowUpResponse`**: Also uses `callGeminiWithTimeout` for final analysis

## Debug Logging

Console logs help track timeout behavior:
- `⏱️ Starting API call with 5000ms timeout...`
- `⏰ Timeout reached - AI did not respond in time`
- `✅ API responded before timeout`
- `⚠️ Using fallback response due to timeout`

## Benefits

1. **Better User Experience**: No hanging or frozen chat interface
2. **Graceful Degradation**: App continues working even if AI is slow or unavailable
3. **Transparent Communication**: Users know when AI isn't working optimally
4. **Reliable Conversation Flow**: Always gets a response within 5 seconds

## Testing the Feature

### To Test Timeout Behavior:
1. Open browser DevTools (F12) → Network tab
2. Throttle network to "Slow 3G" or "Offline"
3. Send a message in the chatbot
4. Within 5 seconds, you should see:
   - Timeout message in chat
   - Fallback question appears
   - Console logs showing timeout occurred

### To Test Normal Behavior:
1. Use normal network connection
2. Send a message
3. AI should respond within 5 seconds
4. No timeout message appears
5. AI-generated follow-up questions display

## Configuration

The timeout duration can be adjusted by changing the `timeoutMs` parameter:
```javascript
// Default is 5000ms (5 seconds)
const aiResponse = await callGeminiWithTimeout(messages, ROOMMATE_EXPERT_PROMPT, 5000);

// To change to 10 seconds:
const aiResponse = await callGeminiWithTimeout(messages, ROOMMATE_EXPERT_PROMPT, 10000);
```

## Files Modified
- `/frontend/src/Chatbot.js`
  - Added `callGeminiWithTimeout` function
  - Updated `handleUserResponse` to use timeout wrapper
  - Updated `handleFollowUpResponse` to use timeout wrapper
  - Enhanced error handling to detect timeout vs other errors

## Current Status
✅ Timeout feature implemented and working
✅ Fallback questions configured
✅ User-facing timeout messages added
✅ Debug logging in place
✅ App compiled successfully

## Next Steps for Further Enhancement (Optional)
1. Make timeout duration configurable via environment variable
2. Add retry mechanism (e.g., retry once before falling back)
3. Track timeout frequency for monitoring
4. Add different fallback strategies based on conversation context
