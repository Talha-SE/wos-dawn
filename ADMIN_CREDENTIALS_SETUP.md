# Admin Setup - Email + Password Method

## Summary

Admin authentication now uses **both email and password** from the **server** `.env` file. No user registration required - the admin account is created automatically!

## Quick Setup (3 Steps)

### 1. Edit `server/.env`

Add these two lines:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123!
```

### 2. Restart Server

```bash
cd server
npm run dev
```

### 3. Login as Admin

- Go to login page
- Select "Admin" role
- Enter the email and password from `.env`
- Done! ✨

## How It Works

### First Login
1. You enter the email and password from `.env`
2. System checks: `email === ADMIN_EMAIL && password === ADMIN_PASSWORD`
3. If match:
   - Admin user is **created automatically** in database
   - Password is hashed and stored
   - `isAdmin: true` is set
   - You get admin access

### Subsequent Logins
- Same credentials work
- No need to re-create anything
- Admin status persists

## Key Features

✅ **No Registration Needed** - Admin account is auto-created on first login
✅ **Separate Credentials** - Admin uses dedicated email/password from `.env`
✅ **Secure** - Password is hashed in database, plain text only in `.env`
✅ **Simple** - Just 2 environment variables
✅ **Independent** - Admin account is separate from regular users

## Security Best Practices

⚠️ **Use a strong password** for `ADMIN_PASSWORD`
⚠️ **Never commit** `.env` to Git (it's in .gitignore)
⚠️ **Keep `.env` secure** on your server
✅ **Change default password** immediately in production

## Example Configuration

### Development `.env`
```bash
ADMIN_EMAIL=admin@localhost.com
ADMIN_PASSWORD=DevAdmin123!
```

### Production `.env`
```bash
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=VeryStrongProductionPassword!#$%
```

## Comparison: Old vs New

### ❌ Old Method (Complicated)
1. Set ADMIN_SECRET in server `.env`
2. Copy ADMIN_SECRET to client settings page
3. Store in localStorage
4. Send as header with every request
5. Easy to lose or forget

### ✅ New Method (Simple)
1. Set ADMIN_EMAIL + ADMIN_PASSWORD in server `.env`
2. Login with those credentials
3. That's it!

## FAQ

**Q: Do I need to register the admin email as a regular user first?**
A: No! The admin account is created automatically on first login.

**Q: Can I use the same email for admin and regular user?**
A: Technically yes, but not recommended. Admin credentials bypass regular user authentication.

**Q: What if I change the ADMIN_PASSWORD in .env?**
A: The new password will work immediately. The database password doesn't matter - `.env` credentials take priority.

**Q: Can I have multiple admins?**
A: Currently only one admin via `.env`. For additional admins, use the `makeAdmin.ts` script.

**Q: Where do I put these credentials?**
A: In **server/.env** file (NOT client/.env)

**Q: Is this secure?**
A: Yes! 
- Password is hashed in database
- Uses same JWT authentication as regular users
- `.env` file is never exposed to client
- Credentials are server-side only

## Troubleshooting

**Problem: "Invalid credentials"**
- Check: Email and password exactly match `.env`
- Check: No extra spaces in `.env` values
- Check: Server was restarted after editing `.env`

**Problem: "You do not have admin privileges"**
- Check: You selected "Admin" role on login page
- Check: Both ADMIN_EMAIL and ADMIN_PASSWORD are set in server `.env`
- Check: Credentials match exactly

**Problem: Can't access /admin routes**
- Check: You're logged in
- Check: You used admin credentials to login
- Solution: Logout and login again with admin credentials

## File Location

**✅ Correct:** `server/.env`
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePass123!
```

**❌ Wrong:** `client/.env`
(Admin credentials should never be in client-side code)

---

**Ready to use!** Just add those 2 lines to `server/.env` and you're all set! 🚀
