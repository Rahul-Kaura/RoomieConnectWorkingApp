# 🔧 RoomieConnect Test User Setup

This script automatically creates the 5 test users in your Auth0 dashboard using the Management API.

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
cd scripts
npm install
```

### Step 2: Configure Auth0 Management API

#### 2.1 Create Management API Application
1. Go to your **Auth0 Dashboard** → **Applications**
2. Click **"Create Application"**
3. Name: `RoomieConnect Management API`
4. Type: **Machine to Machine Applications**
5. Select your **Management API** (Auth0 Management API)
6. Grant these **scopes**:
   - `create:users`
   - `read:users`
   - `update:users`

#### 2.2 Get Your Credentials
After creating the application, note down:
- **Domain**: `your-tenant.auth0.com`
- **Client ID**: From the application settings
- **Client Secret**: From the application settings

### Step 3: Update Script Configuration

Edit `create-auth0-test-users.js` and replace:

```javascript
const AUTH0_DOMAIN = 'your-tenant.auth0.com';
const CLIENT_ID = 'your_management_api_client_id';
const CLIENT_SECRET = 'your_management_api_client_secret';
```

### Step 4: Run the Script
```bash
npm run create-test-users
```

## 📋 What Gets Created

The script creates 5 test users:

| Name | Email | Password |
|------|-------|----------|
| Alex Chen | alex.chen.test@roomieconnect.app | TestUser123! |
| Maya Patel | maya.patel.test@roomieconnect.app | TestUser123! |
| Jordan Kim | jordan.kim.test@roomieconnect.app | TestUser123! |
| Sofia Rodriguez | sofia.rodriguez.test@roomieconnect.app | TestUser123! |
| Marcus Johnson | marcus.johnson.test@roomieconnect.app | TestUser123! |

## 🔍 Expected Output

```
🚀 Creating Auth0 test users for RoomieConnect...

🔐 Getting Auth0 Management API token...
✅ Got management token

✅ Created user: Alex Chen (alex.chen.test@roomieconnect.app)
✅ Created user: Maya Patel (maya.patel.test@roomieconnect.app)
✅ Created user: Jordan Kim (jordan.kim.test@roomieconnect.app)
✅ Created user: Sofia Rodriguez (sofia.rodriguez.test@roomieconnect.app)
✅ Created user: Marcus Johnson (marcus.johnson.test@roomieconnect.app)

📊 Summary:
✅ Total successful: 5
⚠️ Already existed: 0
❌ Failed: 0

🎉 Test users are ready! You can now login with:
   📧 alex.chen.test@roomieconnect.app / TestUser123!
   📧 maya.patel.test@roomieconnect.app / TestUser123!
   📧 jordan.kim.test@roomieconnect.app / TestUser123!
   📧 sofia.rodriguez.test@roomieconnect.app / TestUser123!
   📧 marcus.johnson.test@roomieconnect.app / TestUser123!
```

## ⚠️ Troubleshooting

### "Failed to get management token"
- ✅ Check your Auth0 domain is correct
- ✅ Verify Client ID and Client Secret
- ✅ Ensure the Machine-to-Machine app has Management API access

### "Failed to create user: Forbidden"
- ✅ Check the Management API application has `create:users` scope
- ✅ Verify the application is authorized for the Management API

### "User already exists"
- ✅ This is normal if you run the script multiple times
- ✅ The script will skip existing users and continue

## 🎯 After Setup

Once users are created, you can:

1. **Test Login Flow**: Use any of the test emails/passwords to login
2. **Test Different Profiles**: Each user has different preferences for matching
3. **Test Cross-User Matching**: Login as different users to see different match results
4. **Test Profile Persistence**: Complete chatbot, refresh, should go to matches

## 🔐 Security Notes

- These are **test accounts only** - don't use in production
- The script can be run multiple times safely
- Consider deleting test users after development if not needed
- Store your Management API credentials securely 