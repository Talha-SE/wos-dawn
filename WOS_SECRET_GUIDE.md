# How to Get the Correct WOS Secret

## The Problem

You're seeing "Sign Error" which means the WOS API is rejecting our request signature. This happens when:
- The WOS_SECRET in your `.env` file is incorrect or outdated
- The signing algorithm has changed
- The API endpoints have changed

## Current Status

Your `.env` has:
```
WOS_SECRET=d3b7c2e58b97b29faa637dc31af8feb6
```

This secret might be:
- ❌ Outdated (WOS updates their secrets periodically)
- ❌ Invalid for the current API version
- ❌ Not the correct secret for redemption endpoint

## Solution: Get the Latest Secret

### Method 1: Inspect Official Website (Recommended)

1. **Visit the official WOS gift code website:**
   ```
   https://wos-giftcode.centurygame.com/
   ```

2. **Open Browser DevTools:**
   - Press `F12` or `Ctrl+Shift+I` (Windows)
   - Go to the "Network" tab
   - Enable "Preserve log"

3. **Enter a Gift Code:**
   - Enter your Game ID
   - Enter a gift code (any code, even invalid)
   - Click "Redeem" or "Exchange"

4. **Find the Request:**
   - Look for a request to `/api/gift_code` or similar
   - Click on it
   - Go to "Payload" or "Form Data"

5. **Analyze the Signature:**
   - Look for parameters: `fid`, `cdk`, `time`, `sign`
   - The `sign` is the MD5 hash
   - You need to reverse-engineer how it's calculated

6. **Find the Secret in JavaScript:**
   - Go to "Sources" tab in DevTools
   - Search through JS files for:
     - Keywords: `secret`, `key`, `salt`, `md5`
     - Function that generates the `sign` parameter
   - The secret is usually a 32-character hex string

### Method 2: Check the Page Source

1. **View source of the official page:**
   ```
   view-source:https://wos-giftcode.centurygame.com/
   ```

2. **Search for:**
   - `var secret`
   - `const secret`
   - `key:`
   - MD5 function calls
   - Any hex strings (32 characters)

### Method 3: Community Sources

Check these communities for updated secrets:
- Discord servers for WOS
- Reddit: r/WhiteoutSurvival
- GitHub repos with WOS tools
- Telegram channels dedicated to WOS codes

### Method 4: JavaScript Deobfuscation

If the JS is minified/obfuscated:

1. **Find the main JS file** (usually in sources like `app.js`, `main.js`, `chunk.js`)

2. **Beautify it:**
   - Use DevTools "Pretty print" (click `{}` button)
   - Or use online tools like jsbeautifier.org

3. **Search for patterns:**
   ```javascript
   // Common patterns
   md5(... + "secret_here")
   sign: md5(params + secret)
   var e = "32_char_hex_string"
   ```

## Testing the Secret

Once you get a new secret, update your `.env`:

```env
WOS_SECRET=your_new_secret_here
```

Restart the server and test:
```powershell
# Test with curl or PowerShell
curl -X POST http://localhost:4000/api/gift/redeem/by-id \
  -H "Content-Type: application/json" \
  -d '{"gameId":"382084580","code":"WOS1105"}'
```

## Common WOS Secrets (Historical)

These are **examples** of what WOS secrets look like (may be outdated):

```
d3b7c2e58b97b29faa637dc31af8feb6  ← Your current one
tB87#kPtkxqOS2  ← Example format
8379c08554f1cea9f34197566e0126c0  ← Example format
```

**Note:** These are just examples. You MUST get the current active secret.

## Advanced: Multiple Secrets

WOS might use different secrets for different operations:

```env
# In your .env
WOS_SECRET=primary_secret
WOS_SECRET_PLAYER=secret_for_player_api
WOS_SECRET_REDEEM=secret_for_redemption
WOS_SECRETS=secret1,secret2,secret3  # Try multiple
```

Our code will try all of them automatically.

## Verification

When you have the correct secret, you'll see:
```
✅ SUCCESS with strategy: cdk-time-secret secret index: 0
```

Instead of:
```
❌ Sign Error
```

## Alternative: Use Official App

If you can't get the secret working:

1. **Fallback option:** Manual redemption through the game
2. **User instruction:** Guide users to redeem in-app
3. **Notification system:** Alert users of new codes via email/push

## Current Implementation Status

✅ Multiple signing strategies implemented  
✅ Automatic fallback between strategies  
✅ Support for multiple secrets  
✅ Detailed logging for debugging  
❌ Need valid WOS_SECRET  

## Next Steps

1. **Get the correct secret** using methods above
2. **Update `.env`** with the new secret
3. **Restart server** to load new secret
4. **Test redemption** again
5. **Monitor for changes** (WOS updates secrets periodically)

## Monitoring Secret Changes

WOS may change their secret. To monitor:

1. **Set up alerts** when redemptions start failing
2. **Check official website** regularly
3. **Join community channels** for updates
4. **Implement fallback** notification system

## Support

If all else fails:
- Document that the feature requires a valid WOS API secret
- Provide instructions for users to redeem in-game
- Use the system for code tracking/notification only

---

**TL;DR:** The secret `d3b7c2e58b97b29faa637dc31af8feb6` in your `.env` is likely outdated. Visit https://wos-giftcode.centurygame.com/, open DevTools, redeem a code, and find the current secret in the JavaScript or network requests.
