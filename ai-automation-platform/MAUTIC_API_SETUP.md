# Mautic OAuth2 API Setup Guide

## Step 1: Access Mautic Admin Panel
1. Open your browser and go to: **https://mautic.bookaistudio.com**
2. Log in with your admin credentials

## Step 2: Enable API in Mautic
1. Go to **Settings** (gear icon in top right)
2. Click on **Configuration**
3. Go to **API Settings** tab
4. Enable the following:
   - ✅ **API enabled?** = Yes
   - ✅ **Enable HTTP basic auth?** = Yes
   - ✅ **Enable OAuth 1.0a?** = Yes (optional)
   - ✅ **Enable OAuth 2?** = Yes
   - ✅ **Access token lifetime (seconds)** = 3600 (or your preference)
   - ✅ **Refresh token lifetime (seconds)** = 7200 (or your preference)
5. Click **Save & Close**

## Step 3: Create OAuth2 Client Application
1. Go to **Settings** → **API Credentials**
2. Click **New** to create a new API credential
3. Fill in the details:
   - **Name**: AI Automation Platform
   - **Client ID**: (This will be auto-generated, or you can use your existing one)
   - **Client Secret**: (This will be auto-generated, or you can use your existing one)
   - **Redirect URI**: https://bookaistudio.com/oauth/callback (or leave blank for client credentials)
   - **Grant Types**: Select **Client Credentials** and **Authorization Code**
4. Click **Save & Close**

## Step 4: Get Your API Credentials
After creating the OAuth2 application, note down:
- **Client ID**: This should match what you provided
- **Client Secret**: This should match what you provided

## Step 5: Test API Access
You can test basic API access by going to:
**https://mautic.bookaistudio.com/api/contacts**

## Current Credentials Analysis
Based on what you provided:
- Client ID: `1_2ysm8ht9fqg4swgwc4so84g0c8cgowg84s0s0so4kcc08s4w00`
- Client Secret: `22l7pki2y934s08g40g84wkck0w00wcs80wcko88wgsokggw08`

## Troubleshooting Steps
If the API is still not working after the above steps:

### Option A: Try Basic Auth (Username/Password)
1. In Mautic, go to **Settings** → **Users**
2. Create or edit a user account
3. Note the username and password
4. We can modify our API manager to use Basic Auth instead

### Option B: Regenerate OAuth2 Credentials
1. Delete the existing OAuth2 application
2. Create a new one with fresh credentials
3. Update the .env file with new credentials

### Option C: Check API URL
The API base URL should be: `https://mautic.bookaistudio.com/api`

## Test Commands
After configuration, test with:

```bash
# Test OAuth2 token
curl -X POST "https://mautic.bookaistudio.com/api/oauth/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"

# Test API with Basic Auth (if configured)
curl -u "username:password" "https://mautic.bookaistudio.com/api/contacts"
```

## Next Steps
1. Please follow the steps above to configure Mautic API
2. Let me know if you encounter any issues
3. Once configured, we can test the API integration again

Would you like me to create an alternative API manager that supports both OAuth2 and Basic Auth methods?
