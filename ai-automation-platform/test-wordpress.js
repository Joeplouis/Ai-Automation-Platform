#!/usr/bin/env node

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config();

async function testWordPressAPI() {
  console.log('🔧 Testing WordPress API Integration...\n');

  const wpApiUrl = process.env.WP_API_URL;
  const wpBaseUrl = process.env.WP_BASE_URL;
  const wpUsername = process.env.WP_USERNAME;
  const wpPassword = process.env.WP_APP_PASSWORD;

  console.log(`📡 API URL: ${wpApiUrl}`);
  console.log(`🌐 Base URL: ${wpBaseUrl}`);
  console.log(`👤 Username: ${wpUsername}`);
  console.log(`🔑 App Password: ${wpPassword ? `${wpPassword.substring(0, 10)}...` : 'NOT SET'}\n`);

  if (!wpApiUrl || !wpUsername || !wpPassword) {
    console.error('❌ WordPress API credentials not configured properly');
    return;
  }

  // Create Basic Auth header
  const authString = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get posts
    console.log('🧪 Test 1: Fetching posts...');
    const postsResponse = await fetch(`${wpApiUrl}/posts?per_page=5`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (postsResponse.ok) {
      const posts = await postsResponse.json();
      console.log('✅ Posts API test successful');
      console.log(`📊 Found ${posts.length} posts`);
      if (posts.length > 0) {
        console.log(`📝 Latest post: "${posts[0].title.rendered}" (ID: ${posts[0].id})`);
      }
      console.log('');
    } else {
      console.log(`❌ Posts API test failed: ${postsResponse.status}\n`);
    }

    // Test 2: Get current user (authenticated)
    console.log('🧪 Test 2: Testing authentication...');
    const userResponse = await fetch(`${wpApiUrl}/users/me`, { headers });

    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log('✅ Authentication successful');
      console.log(`👤 Logged in as: ${user.name} (${user.email})`);
      console.log(`🔐 User roles: ${user.roles ? user.roles.join(', ') : 'No roles data'}\n`);
    } else {
      console.log(`❌ Authentication test failed: ${userResponse.status}\n`);
      const error = await userResponse.text();
      console.log(`Error: ${error}\n`);
    }

    // Test 3: Get site settings (authenticated)
    console.log('🧪 Test 3: Fetching site settings...');
    const settingsResponse = await fetch(`${wpApiUrl}/settings`, { headers });

    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('✅ Settings API test successful');
      console.log(`📖 Site Title: ${settings.title}`);
      console.log(`📝 Description: ${settings.description}`);
      console.log(`🌐 Site URL: ${settings.url}\n`);
    } else {
      console.log(`❌ Settings API test failed: ${settingsResponse.status}\n`);
    }

    // Test 4: Get pages
    console.log('🧪 Test 4: Fetching pages...');
    const pagesResponse = await fetch(`${wpApiUrl}/pages?per_page=5`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (pagesResponse.ok) {
      const pages = await pagesResponse.json();
      console.log('✅ Pages API test successful');
      console.log(`📄 Found ${pages.length} pages`);
      if (pages.length > 0) {
        console.log(`📄 Sample page: "${pages[0].title.rendered}" (ID: ${pages[0].id})`);
      }
      console.log('');
    } else {
      console.log(`❌ Pages API test failed: ${pagesResponse.status}\n`);
    }

    // Test 5: Get categories
    console.log('🧪 Test 5: Fetching categories...');
    const categoriesResponse = await fetch(`${wpApiUrl}/categories`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (categoriesResponse.ok) {
      const categories = await categoriesResponse.json();
      console.log('✅ Categories API test successful');
      console.log(`🏷️ Found ${categories.length} categories`);
      if (categories.length > 0) {
        console.log(`🏷️ Sample category: "${categories[0].name}" (ID: ${categories[0].id})`);
      }
      console.log('');
    } else {
      console.log(`❌ Categories API test failed: ${categoriesResponse.status}\n`);
    }

    console.log('🎉 WordPress API integration test completed!');
    console.log('\n📋 Available WordPress API Tools:');
    console.log('• 📝 Post Management (CRUD operations)');
    console.log('• 📄 Page Management');
    console.log('• 👥 User Management');
    console.log('• 🏷️ Category & Tag Management');
    console.log('• 📷 Media Library Management');
    console.log('• ⚙️ Site Settings Configuration');
    console.log('• 🔌 Plugin Management');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testWordPressAPI();
