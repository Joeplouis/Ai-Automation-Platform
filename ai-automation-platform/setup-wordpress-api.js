#!/usr/bin/env node

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config();

async function createWordPressAPI() {
  console.log('🔧 Setting up WordPress API Integration...\n');

  const wpBaseUrl = process.env.WP_DOMAIN ? `https://${process.env.WP_DOMAIN}` : 'http://localhost:8081';
  const wpApiUrl = `${wpBaseUrl}/wp-json/wp/v2`;

  console.log(`🌐 WordPress URL: ${wpBaseUrl}`);
  console.log(`📡 API URL: ${wpApiUrl}\n`);

  try {
    // Test basic API connectivity
    console.log('🧪 Test 1: Testing API connectivity...');
    const testResponse = await fetch(`${wpApiUrl}/posts?per_page=1`);
    
    if (testResponse.ok) {
      const posts = await testResponse.json();
      console.log('✅ WordPress REST API is accessible');
      console.log(`📊 Found ${posts.length} posts\n`);
    } else {
      console.log(`❌ API test failed: ${testResponse.status}\n`);
    }

    // Get users (for admin user info)
    console.log('🧪 Test 2: Getting user information...');
    const usersResponse = await fetch(`${wpApiUrl}/users?per_page=1`);
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('✅ Users API accessible');
      if (users.length > 0) {
        console.log(`👤 Admin user: ${users[0].name} (ID: ${users[0].id})\n`);
      }
    } else {
      console.log(`❌ Users API test failed: ${usersResponse.status}\n`);
    }

    // Check current site settings
    console.log('🧪 Test 3: Getting site information...');
    const settingsResponse = await fetch(`${wpApiUrl}/settings`);
    
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('✅ Site settings accessible');
      console.log(`📖 Site Title: ${settings.title}`);
      console.log(`📝 Description: ${settings.description}`);
      console.log(`🌐 URL: ${settings.url}\n`);
    } else {
      console.log(`❌ Settings API test failed: ${settingsResponse.status}\n`);
    }

    console.log('🎯 Next Steps:');
    console.log('1. Log into WordPress admin at: ' + wpBaseUrl + '/wp-admin');
    console.log('2. Go to Users → Profile');
    console.log('3. Scroll down to "Application Passwords"');
    console.log('4. Create new application password named "AI Automation Platform"');
    console.log('5. Copy the generated password for API access\n');

    console.log('📋 WordPress API Configuration:');
    console.log(`WP_API_URL=${wpApiUrl}`);
    console.log(`WP_BASE_URL=${wpBaseUrl}`);
    console.log(`WP_USERNAME=joeplouis68@gmail.com`);
    console.log(`WP_APP_PASSWORD=<application_password_from_step_4>`);

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

createWordPressAPI();
