const crypto = require('crypto');

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function encode_data(data, secret) {
  // Sort keys alphabetically
  const sorted_keys = Object.keys(data).sort();
  
  // Create the base string with sorted parameters
  const encoded_data = sorted_keys
    .map(key => `${key}=${data[key]}`)
    .join('&');
  
  console.log('Sorted keys:', sorted_keys);
  console.log('Encoded data (for signing):', encoded_data);
  console.log('Secret:', secret);
  console.log('String to hash:', encoded_data + secret);
  
  // Sign with secret appended
  const sign = md5(encoded_data + secret);
  
  console.log('Generated sign:', sign);
  
  // Return with sign FIRST, then sorted data keys
  const result = { sign };
  sorted_keys.forEach(key => {
    result[key] = data[key];
  });
  
  return result;
}

function asForm(data) {
  const entries = Object.entries(data);
  const formString = entries.map(([k, v]) => `${k}=${v}`).join('&');
  console.log('Form string:', formString);
  return formString;
}

// Test with actual values
const gameId = '382084580';
const code = 'WOS1105';
const time = Math.floor(Date.now() / 1000).toString();
const secret = 'tB87#kPtkxqOS2';

console.log('\n=== Testing Gift Code Redemption ===');
console.log('Game ID:', gameId);
console.log('Gift Code:', code);
console.log('Timestamp:', time);
console.log('');

const data_to_encode = {
  fid: gameId,
  cdk: code,
  time: time
};

console.log('Data to encode:', data_to_encode);
console.log('');

const encoded = encode_data(data_to_encode, secret);
console.log('\nEncoded result:', encoded);
console.log('');

const formData = asForm(encoded);
console.log('\n=== Final form data to POST ===');
console.log(formData);
