# Quick Start Guide - Gift Code Redemption

## Testing the New Feature

### 1. Start the Application

**Terminal 1 - Server:**
```powershell
cd server
npm install
npm run dev
```

**Terminal 2 - Client:**
```powershell
cd client
npm install
npm run dev
```

### 2. Access Quick Redeem Page

Open your browser and navigate to:
```
http://localhost:5173/quick-redeem
```

Or click the "🎁 Quick Redeem" link on the Login/Signup pages.

### 3. Test Redemption

1. **Enter Game ID**: 
   - Use your actual WOS Game ID (find it in-game: Profile → Settings → Account)
   - Example: `123456789`

2. **Select or Enter Gift Code**:
   - Choose from the active codes list
   - Or type a code like: `WOS1105`, `DCMilestone`, `DiscordMilestone`, `gogoWOS`

3. **Click "Redeem Gift Code"**

4. **Check Result**:
   - ✅ Success: "Gift code redeemed successfully!"
   - ❌ Error: Code expired, invalid, or already redeemed

### 4. Test API Directly (Optional)

Using PowerShell:
```powershell
$body = @{
    gameId = "123456789"
    code = "WOS1105"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/gift/redeem/by-id" -Method POST -Body $body -ContentType "application/json"
```

Using curl (if installed):
```powershell
curl -X POST http://localhost:4000/api/gift/redeem/by-id -H "Content-Type: application/json" -d '{\"gameId\":\"123456789\",\"code\":\"WOS1105\"}'
```

### 5. Add Test Gift Codes (For Testing)

You'll need some gift codes in your database. You can add them through your admin endpoints or directly in MongoDB.

**Example MongoDB insert:**
```javascript
db.giftcodes.insertMany([
  {
    code: "WOS1105",
    active: true,
    expiresAt: new Date("2025-12-31"),
    createdAt: new Date()
  },
  {
    code: "DCMilestone",
    active: true,
    createdAt: new Date()
  },
  {
    code: "DiscordMilestone",
    active: true,
    createdAt: new Date()
  }
])
```

### 6. Test with Real WOS Game ID

**Important**: For actual redemption to work with WOS servers:
- You need valid `WOS_SECRET` keys in your `.env` file
- The Game ID must be a real WOS player ID
- The gift code must be currently active in the game

### Current Active Codes (from wosrewards.com)
As of the site check:
- `WOS1105`
- `DCMilestone`
- `DiscordMilestone`
- `gogoWOS`

(Codes may expire - check wosrewards.com for latest)

### Features to Test

✅ **Quick Redeem Page**
- [ ] Enter Game ID
- [ ] Game ID persists in localStorage
- [ ] Select code from active list
- [ ] Type custom code
- [ ] See redemption status
- [ ] Refresh codes button works

✅ **Enhanced Redeem Page (Authenticated)**
- [ ] Login to dashboard
- [ ] Navigate to Redeem tab
- [ ] Toggle "Redeem for different Game ID"
- [ ] Enter alternative ID
- [ ] Redeem code
- [ ] Status updates correctly

✅ **Public API Endpoints**
- [ ] GET `/api/gift/active-codes` returns codes
- [ ] POST `/api/gift/redeem/by-id` works without auth
- [ ] Proper error messages for invalid inputs

### Troubleshooting

**"Failed to load active codes"**
- Check MongoDB is running
- Ensure you have gift codes in the database
- Check server console for errors

**"Invalid Game ID format"**
- Game ID must be numeric only
- No spaces or special characters

**"Redemption failed"**
- Check if WOS_SECRET is set in server/.env
- Verify the gift code is currently active
- Check WOS API is accessible
- Look at server console logs for detailed errors

### Environment Setup

Make sure your `server/.env` has:
```env
MONGODB_URI=mongodb://localhost:27017/wos-dawn
JWT_SECRET=your-secret-key
WOS_PLAYER_URL=https://wos-giftcode-api.centurygame.com/api/player
WOS_GIFT_URL=https://wos-giftcode-api.centurygame.com/api/gift_code
WOS_SECRET=your-wos-secret
WOS_SECRETS=secret1,secret2,secret3
```

### Video Walkthrough Checklist

Record testing these scenarios:
1. ✅ Navigate to /quick-redeem
2. ✅ Enter Game ID and see it save
3. ✅ Select code from list
4. ✅ Successful redemption
5. ✅ Try expired/invalid code
6. ✅ Refresh codes list
7. ✅ Type custom code
8. ✅ Login and use authenticated redeem
9. ✅ Toggle alternative Game ID
10. ✅ Redeem for different account

### Next Steps

After testing:
1. Add more gift codes to database
2. Set up code scraping from wosrewards.com (optional)
3. Configure rate limiting for production
4. Add CAPTCHA if deploying publicly
5. Set up monitoring for WOS API changes

Happy Testing! 🎮🎁
