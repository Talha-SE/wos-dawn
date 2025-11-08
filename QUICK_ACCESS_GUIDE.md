# 🎁 WOS Gift Code Redemption - Quick Access Guide

## Ways to Access the Feature

### Method 1: Direct URL (Fastest)
```
http://localhost:5173/quick-redeem
```
Just open your browser and go directly to the Quick Redeem page!

---

### Method 2: From Login Page
```
1. Navigate to: http://localhost:5173/login
2. Look for: "🎁 Quick Redeem (No login required)" at the bottom
3. Click the link
```

---

### Method 3: From Signup Page
```
1. Navigate to: http://localhost:5173/signup
2. Look for: "🎁 Quick Redeem (No login required)" at the bottom
3. Click the link
```

---

### Method 4: From Dashboard (Authenticated)
```
1. Login to your account
2. Click "Redeem" in the sidebar
3. Use the enhanced redeem features
4. Toggle "Redeem for different Game ID" if needed
```

---

## 🎯 Quick Redemption Steps

### 1️⃣ Open Quick Redeem Page
```
Navigate to: /quick-redeem
```

### 2️⃣ Enter Your Game ID
```
Example: 123456789
```
💡 **Where to find it**: 
- Open Whiteout Survival
- Tap Profile → Settings → Account
- Copy the numeric Game ID

### 3️⃣ Choose Your Gift Code

**Option A: Select from Active List**
- Scroll to "Available Gift Codes"
- Click on any code card
- It will auto-populate the code field

**Option B: Type Manually**
- Type any gift code in the input field
- Example codes: `WOS1105`, `DCMilestone`, `gogoWOS`

### 4️⃣ Click "Redeem Gift Code"
- Wait for the status message
- ✅ Green = Success!
- ❌ Red = Error (expired, invalid, or already redeemed)

### 5️⃣ Enjoy Your Rewards!
- Rewards will appear in your game
- Check your in-game mail/inventory

---

## 📱 Current Active Codes (from wosrewards.com)

Try these codes:
- ✨ `WOS1105`
- ✨ `DCMilestone`
- ✨ `DiscordMilestone`
- ✨ `gogoWOS`

*(Codes may expire - check the active list on the page)*

---

## 🎮 Page Layout Overview

```
┌─────────────────────────────────────────┐
│  WOS GIFT CODE REDEEMER                 │
│  Instant redemption for WOS gift codes  │
├─────────────────────────────────────────┤
│                                         │
│  QUICK REDEEM                           │
│  ┌─────────────────────────────────┐   │
│  │ Your Game ID: [____________]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Gift Code: [_______________]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Or select from active codes           │
│                                         │
│  ┌──────────┬──────────┬──────────┐    │
│  │ WOS1105  │ DCMiles  │ Discord  │    │
│  │ Click to │ tone     │ Mileston │    │
│  │ Select   │          │ e        │    │
│  └──────────┴──────────┴──────────┘    │
│                                         │
│  [  🎁 Redeem Gift Code  ]             │
│                                         │
│  Status: Waiting for redemption...      │
└─────────────────────────────────────────┘
```

---

## 🔥 Pro Tips

### Save Time
- Your Game ID is auto-saved in the browser
- You only need to enter it once!

### Multiple Accounts
- Login to dashboard for advanced features
- Toggle "Redeem for different Game ID"
- Manage multiple game accounts easily

### Stay Updated
- Click "🔄 Refresh" to check for new codes
- Active codes are fetched from the database
- Expired codes are automatically filtered out

### Bookmark It
```
Bookmark: http://localhost:5173/quick-redeem
```
Quick access whenever new codes drop!

---

## 🆘 Troubleshooting

### "Invalid Game ID format"
- ✅ Use numbers only
- ❌ No spaces or dashes
- ❌ No letters

### "Redemption failed"
- Code might be expired
- Code might already be used on your account
- Double-check your Game ID
- Try refreshing the codes list

### Page won't load
- Make sure server is running: `cd server && npm run dev`
- Make sure client is running: `cd client && npm run dev`
- Check MongoDB is connected

---

## 🎊 Start Redeeming!

You're all set! Just follow these simple steps:

1. **Open** → `http://localhost:5173/quick-redeem`
2. **Enter** → Your Game ID
3. **Select** → A gift code
4. **Click** → Redeem
5. **Enjoy** → Your rewards! 🎉

---

## 🌟 Features at a Glance

✅ No login required  
✅ One-page solution  
✅ Auto-save Game ID  
✅ Live code list  
✅ Mobile-friendly  
✅ Instant feedback  
✅ Beautiful UI  
✅ Fast & secure  

Happy Redeeming! 🎮🎁
