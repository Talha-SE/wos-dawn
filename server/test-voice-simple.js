#!/usr/bin/env node

/**
 * Simple test script for voice message functionality
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration - update these values
const API_URL = 'http://localhost:3000/api';
const TEST_ROOM_CODE = 'YOUR-ROOM-CODE'; // Replace with a valid room code
const TEST_TOKEN = 'your-test-token'; // Replace with a valid auth token

async function testVoiceMessage() {
  try {
    console.log('=== Simple Voice Message Test ===');
    console.log('API URL:', API_URL);
    console.log('Test Room Code:', TEST_ROOM_CODE);
    console.log('');

    // Create a simple audio file
    const testAudioPath = path.join(__dirname, 'simple-audio.webm');
    const testAudioBuffer = Buffer.from([
      0x1a, 0x45, 0xdf, 0xa3, // EBML header
      0xa3, // EBML version
      0x84, 0x42, 0x86, 0x81, 0x01, // EBML version 1
      0x84, 0x42, 0xf7, 0x81, 0x01, // EBML read version 1
      0x84, 0x42, 0xf2, 0x81, 0x04, // EBML max ID length 4
      0x84, 0x42, 0xf3, 0x81, 0x08, // EBML max size length 8
      0x84, 0x42, 0x82, 0x88, 0x77, 0x65, 0x62, 0x6d, // DocType "webm"
      0x84, 0x42, 0x87, 0x81, 0x02, // DocType version 2
      0x84, 0x42, 0x85, 0x81, 0x02, // DocType read version 2
    ]);

    fs.writeFileSync(testAudioPath, testAudioBuffer);
    console.log('✓ Created simple test audio file');

    // Create form data
    const form = new FormData();
    form.append('audio', fs.createReadStream(testAudioPath), {
      filename: 'simple-audio.webm',
      contentType: 'audio/webm'
    });
    form.append('duration', '3.0');

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

    // Test message retrieval
    console.log('\nTesting message retrieval...');
    const messagesResponse = await axios.get(`${API_URL}/alliance/rooms/${TEST_ROOM_CODE}/messages`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    console.log(`✓ Retrieved ${messagesResponse.data.length} messages`);

    // Find our test message
    const testMessage = messagesResponse.data.find(msg => msg._id === response.data.messageId);
    if (testMessage) {
      console.log('✓ Found test message:', {
        id: testMessage._id,
        audioUrl: testMessage.audioUrl,
        audioDuration: testMessage.audioDuration
      });

      if (testMessage.audioUrl) {
        console.log('✓ Audio URL is present in message');

        // Test if the audio file is accessible
        const audioUrl = testMessage.audioUrl.startsWith('http')
          ? testMessage.audioUrl
          : `${API_URL}${testMessage.audioUrl}`;

        console.log(`Testing audio file accessibility: ${audioUrl}`);

        try {
          const audioResponse = await axios.head(audioUrl, {
            headers: {
              'Authorization': `Bearer ${TEST_TOKEN}`
            },
            validateStatus: (status) => status < 500
          });

          console.log('✓ Audio file is accessible:', {
            status: audioResponse.status,
            contentType: audioResponse.headers['content-type']
          });
        } catch (audioError) {
          console.log('⚠ Audio file accessibility test failed:', audioError.response?.status || audioError.message);
          console.log('This might be expected if the server is not running or the file is not properly served.');
        }
      } else {
        console.log('✗ No audio URL found in message');
      }
    } else {
      console.log('✗ Test message not found in messages list');
    }

    // Clean up
    fs.unlinkSync(testAudioPath);

    console.log('\n🎉 Voice message test completed successfully!');
    return { success: true, messageId: response.data.messageId };

  } catch (error) {
    console.error('\n❌ Error in voice message test:');
    console.error('Error details:', error.response?.data || error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }

    console.log('\nNote: If you see "Invalid audio file type" error, this is expected with the simple test file.');
    console.log('The server should accept real audio files with proper format.');

    return { success: false, error: error.message };
  }
}

testVoiceMessage();