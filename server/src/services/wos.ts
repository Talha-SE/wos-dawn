import axios from 'axios';
import env from '../config/env';
import { createHash } from 'crypto';

const http = axios.create({ timeout: 15000 });

function md5(input: string) {
  return createHash('md5').update(input).digest('hex');
}

function asForm(data: Record<string, string>) {
  // Build form string maintaining the order from the object
  // Sign should be first, followed by other params in their original order
  const entries = Object.entries(data);
  return entries.map(([k, v]) => `${k}=${v}`).join('&');
}

const log = (...args: any[]) => console.log('[WOS]', ...args);

function getCandidateSecrets(): string[] {
  const set = new Set<string>();
  const add = (s?: string) => {
    const v = (s || '').trim();
    if (v) set.add(v);
  };
  add(process.env.WOS_SECRET);
  add(process.env.WOS_SECRET_PLAYER);
  add(process.env.WOS_SECRET_REDEEM);
  const list = (process.env.WOS_SECRETS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  list.forEach(add);
  
  const secrets = Array.from(set);
  if (secrets.length === 0) {
    log('⚠️  WARNING: No WOS secrets configured!');
    log('Add WOS_SECRET to your .env file');
    log('The secret can be found by inspecting the official WOS gift code website');
  } else {
    log(`📝 Loaded ${secrets.length} WOS secret(s)`);
  }
  
  return secrets;
}

function encode_data(data: Record<string, string>, secret: string) {
  // Sort keys alphabetically
  const sorted_keys = Object.keys(data).sort();
  
  // Create the base string with sorted parameters
  const encoded_data = sorted_keys
    .map(key => `${key}=${data[key]}`)
    .join('&');
  
  // Sign with secret appended
  const sign = md5(encoded_data + secret);
  
  // Return with sign FIRST, then sorted data keys
  // This matches Python's {"sign": sign, **data} where data keys are sorted
  const result: Record<string, string> = { sign };
  sorted_keys.forEach(key => {
    result[key] = data[key];
  });
  
  return result;
}

export async function fetchPlayerProfile(gameId: string) {
  // Strictly follow the working one-liner behavior: single secret, form body, no fallbacks
  const secret = (process.env.WOS_SECRET || '').trim();
  if (!secret) {
    log('⚠️  No WOS_SECRET configured');
    throw new Error('WOS_SECRET is not set');
  }

  try {
    // Use NANOSECONDS timestamp with BigInt to avoid precision loss
    const time = (BigInt(Date.now()) * BigInt(1000000)).toString();
    const signingString = `fid=${gameId}&time=${time}${secret}`;
    const sign = md5(signingString);
    const formData = `fid=${gameId}&sign=${sign}&time=${time}`;

    log('player: POST', { fid: gameId, time, sign, form: formData });

    const { data: response } = await http.post(env.WOS_PLAYER_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    log('player: response', { code: response?.code, msg: response?.msg });
    return response;
  } catch (e: any) {
    const err = e?.response?.data || e?.message || e;
    log('player: error', err);
    throw e;
  }
}

export async function redeemGiftCode(gameId: string, code: string) {
  const secrets = getCandidateSecrets();
  if (secrets.length) {
    for (const secret of secrets) {
      try {
        // Use NANOSECONDS timestamp (Date.now() * 1000000)
        // Use BigInt to avoid precision loss
        const time = (BigInt(Date.now()) * BigInt(1000000)).toString();
        
        const data_to_encode = {
          fid: gameId,
          cdk: code,
          time: time
        };
        
        // Encode using the same method as Discord bot
        const data = encode_data(data_to_encode, secret);
        const formData = asForm(data);
        
        log('redeem: data_to_encode', data_to_encode);
        log('redeem: encoded data', data);
        log('redeem: form string', formData);
        log('redeem: POST', { fid: gameId, cdk: code, time, sign: data.sign });
        
        const { data: response } = await http.post(env.WOS_GIFT_URL, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://wos-giftcode.centurygame.com',
            'Referer': 'https://wos-giftcode.centurygame.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          }
        });
        
        log('redeem: response', { code: response?.code, msg: response?.msg });
        
        if (response && (response.code === 0 || response.msg === 'SUCCESS')) {
          log('✅ SUCCESS!');
          return response;
        }
        
        // Return the response even if not successful for error handling
        if (response) return response;
        
      } catch (e: any) {
        const err = e?.response?.data || e?.message || e;
        log('redeem: error', err);
        return err;
      }
    }
  }
  const payload = { game_id: gameId, player_id: gameId, code, gift_code: code };
  log('redeem: JSON fallback', payload);
  const { data } = await http.post(env.WOS_GIFT_URL, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  log('redeem: JSON response', { code: (data as any)?.code, msg: (data as any)?.msg });
  return data;
}
