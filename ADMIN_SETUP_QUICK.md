# Quick Admin Setup Guide

## How to Become an Admin (Super Simple!)

### Step 1: Add Admin Credentials to Server Environment

Edit your `server/.env` file and add:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password-here
```

Replace with your desired admin email and password. **These are your dedicated admin credentials.**

### Step 2: Restart the Server

```bash
cd server
npm run dev
```

### Step 3: Login

1. Go to the login page
2. Click **"Admin"** role
3. Enter the email and password from your `.env` file
4. You're now an admin! 🎉

## That's It!

- ✅ No scripts to run
- ✅ No database changes needed manually
- ✅ No prior user registration required
- ✅ Admin account is created automatically on first login
- ✅ Just add credentials to `.env` and login

## How It Works

When you login with credentials that match `ADMIN_EMAIL` and `ADMIN_PASSWORD`:
1. The system checks if both email and password match the environment variables
2. If the admin user doesn't exist, it's created automatically
3. You get admin privileges (`isAdmin: true`)
4. You can now access all admin features at `/admin`
5. The admin password is hashed and stored securely in the database

## Multiple Admins?

For now, only one admin email is supported via environment variable. If you need multiple admins:

1. **Method 1**: Use the script for additional admins
   ```bash
   cd server
   npx tsx src/scripts/makeAdmin.ts second-admin@example.com
   ```

2. **Method 2**: Manually update the database
   - Find the user in MongoDB
   - Set `isAdmin: true`

## Security Notes

- ⚠️ Keep your `.env` file secure and never commit it to Git
- ⚠️ Only give admin access to trusted email accounts
- ✅ Admin actions are logged and tied to your user account
- ✅ Uses the same secure JWT authentication as regular users

## Example `.env` File

```bash
# Server Configuration
PORT=4000
MONGODB_URI=mongodb://localhost:27017/wos-dawn
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173

# Admin Configuration (ADD THESE LINES)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=MySecureAdminPassword123!

# Optional
ENABLE_CRON=true
```

## Important Security Notes

- ⚠️ **Use a strong password** for `ADMIN_PASSWORD`
- ⚠️ **Never commit** your `.env` file to Git
- ⚠️ The admin account is **separate** from regular user accounts
- ⚠️ You don't need to register this email as a regular user first
- ✅ The admin user is created automatically on first login

---

**That's all you need!** Just two lines in `.env` and you're an admin. 🚀
