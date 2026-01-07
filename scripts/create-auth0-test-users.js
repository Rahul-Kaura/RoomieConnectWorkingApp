const axios = require('axios');

// Auth0 Configuration - Load from environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'dev-s2103new01u1y2di.us.auth0.com';
const CLIENT_ID = process.env.AUTH0_CLIENT_ID || 'XWSeKVDinNDBbkwV6gmbBXvtugEGcbOm';
const CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || 'j9Qk-HPvmobkhMwZdInRVM1TmogzqsC705rJyH2H_BeXI8sajL3Siqhf7Grr5ZuW';

// Test users to create
const testUsers = [
    {
        email: 'alex.chen.test@roomieconnect.app',
        password: 'TestUser123!',
        name: 'Alex Chen',
        nickname: 'alex',
        user_metadata: {
            profile_type: 'test',
            backend_user_id: 'test-user-1',
            major: 'Computer Science',
            location: 'Berkeley, CA'
        }
    },
    {
        email: 'maya.patel.test@roomieconnect.app',
        password: 'TestUser123!',
        name: 'Maya Patel',
        nickname: 'maya',
        user_metadata: {
            profile_type: 'test',
            backend_user_id: 'test-user-2',
            major: 'Biology',
            location: 'Stanford, CA'
        }
    },
    {
        email: 'jordan.kim.test@roomieconnect.app',
        password: 'TestUser123!',
        name: 'Jordan Kim',
        nickname: 'jordan',
        user_metadata: {
            profile_type: 'test',
            backend_user_id: 'test-user-3',
            major: 'Business',
            location: 'San Francisco, CA'
        }
    },
    {
        email: 'sofia.rodriguez.test@roomieconnect.app',
        password: 'TestUser123!',
        name: 'Sofia Rodriguez',
        nickname: 'sofia',
        user_metadata: {
            profile_type: 'test',
            backend_user_id: 'test-user-4',
            major: 'Psychology',
            location: 'Oakland, CA'
        }
    },
    {
        email: 'marcus.johnson.test@roomieconnect.app',
        password: 'TestUser123!',
        name: 'Marcus Johnson',
        nickname: 'marcus',
        user_metadata: {
            profile_type: 'test',
            backend_user_id: 'test-user-5',
            major: 'Engineering',
            location: 'San Jose, CA'
        }
    }
];

/**
 * Get Auth0 Management API token
 */
async function getManagementToken() {
    try {
        const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            audience: `https://${AUTH0_DOMAIN}/api/v2/`,
            grant_type: 'client_credentials'
        });
        
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Failed to get management token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Create a single test user
 */
async function createTestUser(user, token) {
    try {
        const response = await axios.post(`https://${AUTH0_DOMAIN}/api/v2/users`, {
            connection: 'Username-Password-Authentication', // Default database connection
            email: user.email,
            password: user.password,
            name: user.name,
            nickname: user.nickname,
            user_metadata: user.user_metadata,
            email_verified: true, // Skip email verification for test users
            blocked: false
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ Created user: ${user.name} (${user.email})`);
        return { success: true, user: response.data };
    } catch (error) {
        if (error.response?.status === 409) {
            console.log(`⚠️ User already exists: ${user.name} (${user.email})`);
            return { success: true, user: null, existing: true };
        } else {
            console.error(`❌ Failed to create ${user.name}:`, error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }
}

/**
 * Main function to create all test users
 */
async function createAllTestUsers() {
    console.log('🚀 Creating Auth0 test users for RoomieConnect...\n');
    
    // Validate configuration
    if (AUTH0_DOMAIN === 'YOUR_AUTH0_DOMAIN' || 
        CLIENT_ID === 'YOUR_MANAGEMENT_API_CLIENT_ID' || 
        CLIENT_SECRET === 'YOUR_MANAGEMENT_API_CLIENT_SECRET') {
        console.error('❌ Please update the Auth0 configuration at the top of this script!');
        console.log('\n📋 You need to:');
        console.log('1. Replace YOUR_AUTH0_DOMAIN with your Auth0 domain');
        console.log('2. Replace YOUR_MANAGEMENT_API_CLIENT_ID with your Management API client ID');
        console.log('3. Replace YOUR_MANAGEMENT_API_CLIENT_SECRET with your Management API client secret');
        console.log('\n🔗 Instructions: https://auth0.com/docs/secure/tokens/access-tokens/management-api-access-tokens');
        return;
    }
    
    try {
        // Get management API token
        console.log('🔐 Getting Auth0 Management API token...');
        const token = await getManagementToken();
        console.log('✅ Got management token\n');
        
        // Create all test users
        const results = [];
        for (const user of testUsers) {
            const result = await createTestUser(user, token);
            results.push({ ...result, userData: user });
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Summary
        console.log('\n📊 Summary:');
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const existing = results.filter(r => r.existing);
        
        console.log(`✅ Total successful: ${successful.length}`);
        console.log(`⚠️ Already existed: ${existing.length}`);
        console.log(`❌ Failed: ${failed.length}`);
        
        if (failed.length > 0) {
            console.log('\n❌ Failed users:');
            failed.forEach(f => console.log(`   - ${f.userData.name}: ${f.error}`));
        }
        
        console.log('\n🎉 Test users are ready! You can now login with:');
        testUsers.forEach(user => {
            console.log(`   📧 ${user.email} / ${user.password}`);
        });
        
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

// Run the script
if (require.main === module) {
    createAllTestUsers();
}

module.exports = { createAllTestUsers, testUsers }; 