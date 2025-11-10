# Admin Dashboard Authentication Update

## Summary of Changes

The admin dashboard authentication system has been completely revamped to use **user-based authentication** instead of a separate admin secret key. This makes the system more secure and easier to manage.

## What Changed

### 🔐 Authentication Method
- **Before**: Admin pages required setting an `x-admin-secret` header stored in localStorage
- **After**: Admin pages use the same JWT token authentication as regular users, with an `isAdmin` flag

### 🎯 Key Improvements

1. **Simplified Login Process**
   - Admin users now login with their regular email and password
   - No need to remember or enter a separate 4-digit admin code
   - System automatically checks if the logged-in user has admin privileges

2. **User Model Enhancement**
   - Added `isAdmin: boolean` field to User model
   - Admin status is returned in login response and `/user/me` endpoint

3. **Middleware Update**
   - Created new `requireAdmin` middleware that checks JWT token + admin status
   - All `/admin/*` routes now use: `requireAuth` → `requireAdmin`

4. **Removed Admin Secret**
   - Eliminated the "Set Admin Secret in Settings" requirement
   - Removed all `x-admin-secret` header checks from client-side
   - Settings page no longer has admin secret input field

5. **Enhanced User Management**
   - Users page now displays full profile information (if available)
   - Shows WOS game profile details including:
     - Nickname, Kingdom ID, Stove Level
     - Total recharge amount
     - Avatar image
   - Admin status badge for admin users
   - Improved details view with more user information

## 📁 Files Modified

### Server-Side Changes
- `server/src/models/User.ts` - Added `isAdmin` field
- `server/src/middleware/auth.ts` - Added `requireAdmin` middleware
- `server/src/routes/auth.ts` - Return `isAdmin` in login response
- `server/src/routes/admin.ts` - Changed authentication from secret to JWT+admin check
- `server/src/scripts/makeAdmin.ts` - New script to promote users to admin

### Client-Side Changes
- `client/src/state/AuthContext.tsx` - Added `isAdmin` to User type
- `client/src/App.tsx` - Updated `AdminProtected` component to check user.isAdmin
- `client/src/pages/Login.tsx` - Removed admin code field, added proper admin login flow
- `client/src/admin/pages/Users.tsx` - Removed secret, enhanced profile display
- `client/src/admin/pages/Settings.tsx` - Removed admin secret configuration
- `client/src/admin/pages/Overview.tsx` - Removed secret checks
- `client/src/admin/pages/Rooms.tsx` - Removed secret checks
- `client/src/admin/pages/Slots.tsx` - Removed secret checks
- `client/src/admin/pages/GiftCodes.tsx` - Removed secret checks
- `client/src/admin/pages/ActivityLogs.tsx` - Removed secret checks

## 🚀 How to Use

### Setting Up Admin Access

**Method 1: Environment Variable (Recommended - Simplest)**

1. Add your admin email to the server `.env` file:
   ```bash
   ADMIN_EMAIL=your-admin@example.com
   ```

2. Restart the server

3. Login with that email - you'll automatically get admin privileges!

**Method 2: Manual Database Update**

To promote an existing user to admin status, run this command on the server:

```bash
cd server
npx tsx src/scripts/makeAdmin.ts user@example.com
```

This will:
1. Connect to MongoDB
2. Find the user by email
3. Set their `isAdmin` flag to `true`
4. Save the changes

### Admin Login Flow

1. Go to the login page
2. Click "Admin" role selector
3. Enter your email and password (same as regular login)
4. If your account has admin privileges, you'll be redirected to `/admin`
5. If not, you'll see an error: "You do not have admin privileges"

### For Existing Admins

If you already have an admin account:
1. Add `ADMIN_EMAIL=your-email@example.com` to your server `.env` file
2. Restart the server
3. Login normally - you'll automatically get admin privileges
4. No need to run any scripts or set admin secret anymore

## 🔧 Technical Details

### Admin Route Protection

**Old Way:**
```typescript
router.use((req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== env.ADMIN_SECRET) return res.status(401).json({ message: 'Unauthorized' });
  next();
});
```

**New Way:**
```typescript
router.use(requireAuth);  // Check JWT token
router.use(requireAdmin); // Check isAdmin flag
```

### Frontend Admin Check

**Old Way:**
```typescript
const secret = localStorage.getItem('admin_secret') || '';
api.get('/admin/users', { headers: { 'x-admin-secret': secret } })
```

**New Way:**
```typescript
// Token is automatically added by axios interceptor
api.get('/admin/users')
```

### Admin User Structure

```typescript
{
  _id: string
  email: string
  passwordHash: string
  gameId?: string
  gameName?: string
  automationEnabled: boolean
  suspended: boolean
  suspendedUntil?: Date
  isAdmin: boolean  // ← NEW FIELD
  createdAt: Date
  updatedAt: Date
}
```

## 📊 User Profile Display

The Users page now shows comprehensive profile information for each user:

### Basic Info
- Email, User ID, Created/Updated dates
- Admin status badge
- Automation and suspension status

### WOS Game Profile (when available)
- Nickname and Kingdom ID
- Stove Level and content
- Total recharge amount
- Avatar image

### Actions Available
- Edit user details (email, password, gameId, gameName, settings)
- Suspend user (24h, 3d, 7d, 30d)
- Unsuspend user
- Delete user permanently

## 🎨 UI Improvements

1. **Login Page**
   - Removed confusing 4-digit admin code field
   - Added informative notice about admin authentication
   - Cleaner, more professional look

2. **Settings Page**
   - Removed admin secret configuration section
   - Added informative notice about new authentication method
   - All system management features still available

3. **Users Page**
   - Beautiful profile cards with WOS game data
   - Admin status badges
   - Better organized information layout
   - Enhanced details view with expandable sections

## ⚠️ Important Notes

### Migration Steps

1. **Set Admin Email**: Add to server `.env` file
   ```bash
   ADMIN_EMAIL=your-admin@example.com
   ```

2. **Restart Server**: The admin email will be checked on every login

3. **Client Update**: Users should clear localStorage if they had admin_secret stored (optional)
   ```javascript
   localStorage.removeItem('admin_secret')
   localStorage.removeItem('admin_session')
   ```

4. **Server Environment**: The `ADMIN_SECRET` env variable is no longer used by admin routes (can be removed or kept for other purposes)

### Security Improvements

- **Token-based**: Uses same secure JWT authentication as regular users
- **Centralized**: Admin status is stored in database, not client storage
- **Auditable**: All admin actions are tied to specific user accounts
- **Revocable**: Admin privileges can be removed by updating database

## 🐛 Troubleshooting

### "You do not have admin privileges" Error
- Solution 1 (Easiest): Add `ADMIN_EMAIL=your-email@example.com` to server `.env` and restart
- Solution 2: Run `npx tsx src/scripts/makeAdmin.ts <your-email>` on the server

### Can't Access Admin Dashboard
- Check: Is `ADMIN_EMAIL` set in your server `.env` file?
- Check: Does the email match your login email (case-insensitive)?
- Check: Did you restart the server after adding `ADMIN_EMAIL`?
- Solution: Verify `.env` file and restart server

### Admin Routes Return 401/403
- Check: Is your JWT token valid?
- Check: Does the token belong to an admin user?
- Solution: Log out and log back in

## 📝 Environment Variables

### Required for Admin Access
- `ADMIN_EMAIL` - Email address of the admin user (case-insensitive)
  - Example: `ADMIN_EMAIL=admin@example.com`
  - When this user logs in, they automatically get admin privileges

### Optional/Deprecated
- `ADMIN_SECRET` - No longer used by admin routes, but kept for backward compatibility

## 🎉 Benefits

1. ✅ **Simpler**: No need to manage separate admin secrets
2. ✅ **More Secure**: Uses established JWT authentication
3. ✅ **Better UX**: Single login for all features
4. ✅ **Auditable**: Admin actions tied to user accounts
5. ✅ **Flexible**: Easy to promote/demote admin users
6. ✅ **Professional**: Follows industry best practices

---

**Date**: November 10, 2025
**Author**: AI Assistant
**Version**: 2.0.0
