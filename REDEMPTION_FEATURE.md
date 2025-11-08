# Gift Code Redemption Feature

## Overview
This feature allows users to redeem Whiteout Survival (WOS) gift codes using their Game ID, with or without authentication.

## Features Implemented

### 1. Public Quick Redeem Page (`/quick-redeem`)
- **No login required** - accessible to anyone
- Users enter their Game ID and gift code
- Game ID is saved in localStorage for convenience
- Lists all active gift codes from the database
- Clean, modern UI with real-time status updates
- Direct integration with WOS gift redemption API

**Access:** Navigate to `/quick-redeem` or click the "Quick Redeem" link on Login/Signup pages

### 2. Enhanced Authenticated Redeem Page
- Existing `/dashboard/redeem` page enhanced
- Added option to redeem for alternative Game IDs
- Toggle switch to enable custom Game ID redemption
- Useful for managing multiple accounts
- Maintains existing auto-redemption features

### 3. New API Endpoints

#### `POST /api/gift/redeem/by-id` (Public)
Redeem a gift code for any Game ID without authentication.

**Request:**
```json
{
  "gameId": "123456789",
  "code": "WOS1105"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "message": "Gift code redeemed successfully!",
  "result": {
    "code": 0,
    "msg": "success"
  },
  "gameId": "123456789",
  "redeemedCode": "WOS1105"
}
```

**Response (Error):**
```json
{
  "ok": false,
  "message": "Redemption failed",
  "detail": "Gift code already redeemed or invalid"
}
```

#### `GET /api/gift/active-codes` (Public)
Get list of all active gift codes.

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "code": "WOS1105",
    "expiresAt": "2024-11-30T23:59:59.000Z",
    "createdAt": "2024-11-01T00:00:00.000Z"
  }
]
```

## How to Find Your Game ID

1. Open Whiteout Survival game
2. Tap on your **Profile** icon
3. Go to **Settings** → **Account**
4. Your Game ID is displayed (numeric value)

## Integration with wosrewards.com

The system is designed to work with gift codes from:
- Official WOS channels
- wosrewards.com (as referenced)
- Community sources

Codes are stored in MongoDB and can be managed via admin endpoints.

## Technical Details

### Frontend
- **QuickRedeem.tsx**: Standalone redemption page
- **Redeem.tsx**: Enhanced with alternative Game ID support
- Uses Axios for API calls
- LocalStorage for Game ID persistence
- Responsive design with Tailwind CSS

### Backend
- **routes/gift.ts**: New public endpoints
- **services/wos.ts**: Gift redemption logic with multiple signing strategies
- Supports multiple WOS API secrets for redundancy
- Form-encoded requests to WOS API with MD5 signing

### Security
- Game ID validation (numeric only)
- Rate limiting should be added for production
- No authentication required for public endpoints (by design)
- Authenticated endpoints still available for logged-in users

## Usage Examples

### Quick Redeem (No Login)
```
1. Visit /quick-redeem
2. Enter Game ID: 123456789
3. Select code from list or type: WOS1105
4. Click "Redeem Gift Code"
5. Get instant confirmation
```

### Authenticated Redeem with Alternative ID
```
1. Login to dashboard
2. Go to Redeem page
3. Toggle "Redeem for different Game ID"
4. Enter alternative Game ID
5. Enter or select gift code
6. Click "Redeem now"
```

### API Integration
```javascript
// Example: Redeem via API
const response = await fetch('http://localhost:4000/api/gift/redeem/by-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameId: '123456789',
    code: 'WOS1105'
  })
});

const result = await response.json();
console.log(result.message);
```

## Environment Variables

Ensure these are set in your `.env`:
```
WOS_PLAYER_URL=https://wos-giftcode-api.centurygame.com/api/player
WOS_GIFT_URL=https://wos-giftcode-api.centurygame.com/api/gift_code
WOS_SECRET=your-secret-key
WOS_SECRETS=secret1,secret2,secret3
```

## Future Enhancements

- [ ] Rate limiting on public endpoints
- [ ] CAPTCHA for abuse prevention
- [ ] Gift code scraping from wosrewards.com
- [ ] Email notifications for new codes
- [ ] Redemption history tracking
- [ ] Batch redemption for multiple accounts
- [ ] QR code generation for mobile

## Testing

### Test Quick Redeem
1. Start the server: `cd server && npm run dev`
2. Start the client: `cd client && npm run dev`
3. Navigate to `http://localhost:5173/quick-redeem`
4. Enter a test Game ID and active code
5. Verify redemption success/failure

### Test API Endpoint
```bash
curl -X POST http://localhost:4000/api/gift/redeem/by-id \
  -H "Content-Type: application/json" \
  -d '{"gameId":"123456789","code":"WOS1105"}'
```

## Troubleshooting

**"Invalid Game ID format"**
- Game ID must be numeric only
- Remove any spaces or special characters

**"Redemption failed"**
- Code may be expired
- Code may already be redeemed
- Game ID may be incorrect
- WOS API may be down

**"Failed to fetch codes"**
- Ensure MongoDB is running
- Check that gift codes exist in database
- Verify API URL configuration

## Credits

- WOS API integration based on reverse-engineered endpoints
- Gift codes sourced from wosrewards.com and official channels
- UI inspired by modern gaming dashboards
