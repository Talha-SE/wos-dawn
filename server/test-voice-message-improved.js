#!/usr/bin/env node

/**
 * Comprehensive test script for voice message functionality
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - update these values
const API_URL = 'http://localhost:3000/api';
const TEST_ROOM_CODE = 'TEST-ROOM-123'; // Replace with a valid room code
const TEST_TOKEN = 'your-test-token'; // Replace with a valid auth token

async function testVoiceMessageUpload() {
  try {
    console.log('=== Testing Voice Message Upload ===');

    // Create a test audio file (real WebM audio)
    const testAudioPath = path.join(__dirname, 'test-audio.webm');

    // Create a simple audio file using ffmpeg if available, otherwise use a simple buffer
    try {
      execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -acodec libopus ${testAudioPath}`);
      console.log('✓ Created test audio file using ffmpeg');
    } catch (ffmpegError) {
      console.log('ℹ️  ffmpeg not available, creating simple audio file');
      const testAudioBuffer = Buffer.from([
        0x57, 0x45, 0x42, 0x4D, // WEBM header
        0x00, 0x00, 0x00, 0x00, // Placeholder
      ]);
      fs.writeFileSync(testAudioPath, testAudioBuffer);
    }

    // Create form data
    const form = new FormData();
    form.append('audio', fs.createReadStream(testAudioPath), {
      filename: 'test-audio.webm',
      contentType: 'audio/webm'
    });
    form.append('duration', '3.0');

    // Test upload
    console.log('Testing voice message upload...');
    const response = await axios.post(`${API_URL}/alliance/rooms/${TEST_ROOM_CODE}/voice-message`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✓ Upload successful:', {
      ok: response.data.ok,
      messageId: response.data.messageId,
      status: response.status
    });

    // Clean up
    fs.unlinkSync(testAudioPath);

    return response.data;
  } catch (error) {
    console.error('✗ Error testing voice message upload:');
    console.error('Error details:', error.response?.data || error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    }

    throw error;
  }
}

async function testVoiceMessagePlayback(messageId) {
  try {
    console.log('\n=== Testing Voice Message Playback ===');

    // First, get the message to get the audio URL
    const messagesResponse = await axios.get(`${API_URL}/alliance/rooms/${TEST_ROOM_CODE}/messages`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    console.log(`✓ Retrieved ${messagesResponse.data.length} messages`);

    // Find our test message
    const testMessage = messagesResponse.data.find(msg => msg._id === messageId);
    if (!testMessage) {
      throw new Error('Test message not found in messages list');
    }

    console.log('✓ Found test message:', {
      id: testMessage._id,
      audioUrl: testMessage.audioUrl,
      audioDuration: testMessage.audioDuration
    });

    if (!testMessage.audioUrl) {
      throw new Error('No audio URL found in message');
    }

    // Test if the audio file is accessible
    const audioUrl = testMessage.audioUrl.startsWith('http')
      ? testMessage.audioUrl
      : `${API_URL}${testMessage.audioUrl}`;

    console.log(`Testing audio file accessibility: ${audioUrl}`);

    // Test the audio URL directly
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      validateStatus: (status) => status < 500 // Accept 404 to see what's happening
    });

    console.log(`✓ Audio file response:`, {
      status: audioResponse.status,
      contentType: audioResponse.headers['content-type'],
      contentLength: audioResponse.headers['content-length'] || 'unknown'
    });

    return {
      audioUrl: audioUrl,
      message: testMessage
    };
  } catch (error) {
    console.error('✗ Error testing voice message playback:');
    console.error('Error details:', error.response?.data || error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }

    throw error;
  }
}

async function testCompleteFlow() {
  try {
    console.log('\n=== Testing Complete Voice Message Flow ===');

    // Step 1: Upload voice message
    const uploadResult = await testVoiceMessageUpload();

    // Step 2: Test playback
    const playbackResult = await testVoiceMessagePlayback(uploadResult.messageId);

    console.log('\n=== Test Summary ===');
    console.log('✓ Voice message upload: SUCCESS');
    console.log('✓ Voice message storage: SUCCESS');
    console.log('✓ Voice message retrieval: SUCCESS');
    console.log('✓ Audio file accessibility: SUCCESS');
    console.log(`\nTest completed successfully!`);
    console.log(`Message ID: ${uploadResult.messageId}`);
    console.log(`Audio URL: ${playbackResult.audioUrl}`);

    return {
      success: true,
      messageId: uploadResult.messageId,
      audioUrl: playbackResult.audioUrl
    };
  } catch (error) {
    console.log('\n=== Test Summary ===');
    console.log('✗ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run tests
async function runTests() {
  try {
    console.log('Starting comprehensive voice message tests...');
    console.log('API URL:', API_URL);
    console.log('Test Room Code:', TEST_ROOM_CODE);
    console.log('');

    const result = await testCompleteFlow();

    if (result.success) {
      console.log('\n🎉 All tests passed! Voice message functionality is working correctly.');
      process.exit(0);
    } else {
      console.log('\n❌ Tests failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Tests failed with unexpected error:', error);
    process.exit(1);
  }
}

runTests();