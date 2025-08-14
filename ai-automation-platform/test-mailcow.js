#!/usr/bin/env node

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config();

async function testMailcowAPI() {
  console.log('🔧 Testing Mailcow API Integration...\n');

  const apiUrl = process.env.MAILCOW_API_URL;
  const apiKey = process.env.MAILCOW_API_KEY;
  const baseUrl = process.env.MAILCOW_BASE_URL;

  console.log(`📡 API URL: ${apiUrl}`);
  console.log(`🔑 API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET'}`);
  console.log(`🌐 Base URL: ${baseUrl}\n`);

  if (!apiUrl || !apiKey) {
    console.error('❌ Mailcow API credentials not configured properly');
    return;
  }

  try {
    // Test 1: Get domains
    console.log('🧪 Test 1: Fetching domains...');
    const domainsResponse = await fetch(`${apiUrl}/get/domain/all`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (domainsResponse.ok) {
      const domains = await domainsResponse.json();
      console.log('✅ Domains API test successful');
      console.log(`📊 Response: ${JSON.stringify(domains, null, 2)}\n`);
    } else {
      console.log(`❌ Domains API test failed: ${domainsResponse.status}`);
      const error = await domainsResponse.text();
      console.log(`Error: ${error}\n`);
    }

    // Test 2: Get mailboxes
    console.log('🧪 Test 2: Fetching mailboxes...');
    const mailboxesResponse = await fetch(`${apiUrl}/get/mailbox/all`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (mailboxesResponse.ok) {
      const mailboxes = await mailboxesResponse.json();
      console.log('✅ Mailboxes API test successful');
      console.log(`📊 Response: ${JSON.stringify(mailboxes, null, 2)}\n`);
    } else {
      console.log(`❌ Mailboxes API test failed: ${mailboxesResponse.status}`);
      const error = await mailboxesResponse.text();
      console.log(`Error: ${error}\n`);
    }

    // Test 3: Get aliases
    console.log('🧪 Test 3: Fetching aliases...');
    const aliasesResponse = await fetch(`${apiUrl}/get/alias/all`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (aliasesResponse.ok) {
      const aliases = await aliasesResponse.json();
      console.log('✅ Aliases API test successful');
      console.log(`📊 Response: ${JSON.stringify(aliases, null, 2)}\n`);
    } else {
      console.log(`❌ Aliases API test failed: ${aliasesResponse.status}`);
      const error = await aliasesResponse.text();
      console.log(`Error: ${error}\n`);
    }

    console.log('🎉 Mailcow API integration test completed!');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testMailcowAPI();
