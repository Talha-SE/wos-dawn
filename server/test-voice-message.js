#!/usr/bin/env node

/**
 * Test script for voice message functionality
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration - update these values
const API_URL = 'http://localhost:3000/api';
const TEST_ROOM_CODE = 'TEST-ROOM-123'; // Replace with a valid room code
const TEST_TOKEN = 'your-test-token'; // Replace with a valid auth token

async function testVoiceMessageUpload() {
  try {
    // Create a test audio file
    const testAudioPath = path.join(__dirname, 'test-audio.webm');
    const testAudioBuffer = Buffer.from([0x57, 0x45, 0x42, 0x4D, 0x00]); // Simple WEBM header

    fs.writeFileSync(testAudioPath, testAudioBuffer);

    // Create form data
    const form = new FormData();
    form.append('audio', fs.createReadStream(testAudioPath), 'test-audio.webm');
    form.append('duration', '5.2');

    // Test upload
    console.log('Testing voice message upload...');
    const response = await axios.post(`${API_URL}/alliance/rooms/${TEST_ROOM_CODE}/voice-message`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    console.log('Upload successful:', response.data);

    // Clean up
    fs.unlinkSync(testAudioPath);

    return response.data;
  } catch (error) {
    console.error('Error testing voice message upload:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    await testVoiceMessageUpload();
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Tests failed:', error);
    process.exit(1);
  }
}

runTests();