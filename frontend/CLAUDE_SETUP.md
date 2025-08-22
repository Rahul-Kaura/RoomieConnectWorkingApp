# Claude API Setup Guide

## Overview
This application now uses Claude Sonnet 3.5 to provide an AI-powered roommate compatibility specialist experience. The AI analyzes user responses and asks intelligent follow-up questions to better understand living preferences.

## Setup Instructions

### 1. Get Your Claude API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the API key (it starts with `sk-ant-`)

### 2. Configure Environment Variables
Create a `.env` file in the `frontend` directory with the following content:

```bash
REACT_APP_CLAUDE_API_KEY=your_actual_api_key_here
```

**Important:** Replace `your_actual_api_key_here` with your real Claude API key.

### 3. Restart the Application
After adding the environment variable, restart your React development server:

```bash
npm start
```

## How It Works

### Background Question
- Users are asked to provide comprehensive information about themselves
- The AI analyzes their response and extracts key information (name, age, major, location)
- Based on the analysis, the AI generates 2-3 personalized follow-up questions

### Follow-up Questions
- Questions are designed to reveal deeper insights about living habits
- The AI processes each response to understand compatibility factors
- Questions focus on study habits, social preferences, cleanliness standards, and conflict resolution

### Final Analysis
- The AI provides a comprehensive summary of the user's profile
- Generates detailed compatibility factors with scores
- Calculates a final compatibility score (0-100)
- Provides specific roommate recommendations

## Fallback Mode
If the Claude API is not configured or encounters an error, the system will:
- Use predefined fallback questions
- Provide standard compatibility analysis
- Continue with the matching process

## Security Notes
- Never commit your API key to version control
- The API key is only used on the client side for Claude API calls
- All API calls are made directly from the browser to Anthropic's servers

## Troubleshooting

### API Key Not Working
- Ensure the environment variable is named exactly `REACT_APP_CLAUDE_API_KEY`
- Check that the API key is valid and active
- Verify the `.env` file is in the correct location (frontend directory)

### Rate Limiting
- Claude API has rate limits based on your plan
- If you encounter rate limiting, wait a moment and try again

### Network Issues
- Ensure your application can reach `api.anthropic.com`
- Check firewall and proxy settings if applicable

## Support
If you encounter issues with the Claude integration, check the browser console for error messages and refer to the [Anthropic API documentation](https://docs.anthropic.com/).
