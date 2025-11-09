# Admin Panel Features Documentation

## Overview
The WOS-DAWN Admin Panel is a comprehensive management system that provides full control over users, alliance rooms, SVS slot reservations, gift codes, and system operations.

## Authentication
- **Admin Secret**: Required for all admin operations
- Set in Settings page and sent as `x-admin-secret` header
- Must match the `ADMIN_SECRET` environment variable on the server

## Core Features

### 1. Dashboard Overview (`/admin/overview`)
**Real-time Statistics:**
- Total Users (Active/Suspended breakdown)
- Alliance Rooms count
- SVS Slot Reservations
- Gift Codes (Total/Active)

**Quick Actions:**
- Direct navigation to all management pages
- System health indicators
- Recent activity preview

### 2. User Management (`/admin/users`)
**View Capabilities:**
- Complete user list with email and creation date
- Password hash viewing (show/hide toggle)
- Game profile information (Game ID & Name)
- Automation status indicator
- Suspension status and expiry date
- Search and filter by email

**Edit User:**
- Change email address
- Reset password (encrypted with bcrypt)
- Update Game ID and Game Name
- Toggle automation enabled/disabled
- Set suspension status
- Set suspension expiry date

**Suspend User (Quick Actions):**
- Suspend for 24 hours
- Suspend for 3 days
- Suspend for 7 days
- Suspend for 30 days
- Manual unsuspend option

**Delete User:**
- Permanent deletion with confirmation
- Cascading deletion of:
  - Alliance memberships
  - Slot reservations
  - Owned alliance rooms (with all members and messages)
  - All user-related data

### 3. Alliance Room Management (`/admin/rooms`)
**View Capabilities:**
- List all alliance rooms
- Room details: name, code, state, owner
- Member count and full member list
- Message count per room
- Suspension status and expiry
- Creation date

**Edit Room:**
- Change room name
- Update state number
- Set suspension status
- Set suspension expiry date

**Manage Members:**
- View all members with roles
- See join dates
- View member emails

**Suspend Room (Quick Actions):**
- Suspend for 24 hours
- Suspend for 3 days
- Suspend for 7 days
- Manual unsuspend option

**Delete Room:**
- Permanent deletion with confirmation
- Removes all members and messages
- Cannot be undone

### 4. SVS Slot Management (`/admin/slots`)
**View Capabilities:**
- Grouped by state number
- Reservation count per state
- Detailed slot information:
  - Date and slot index
  - Alliance name
  - Assigned player name and Game ID
  - Reserved by email
  - Creation date

**Management Actions:**
- Delete individual slot reservations
- Clear all reservations for a specific state
- Refresh to see latest data

### 5. Gift Code Management (`/admin/gift-codes`)
**View Capabilities:**
- List all gift codes
- Active/inactive status
- Expiration dates

**Management Actions:**
- Create new gift codes with expiration
- Enable/disable codes
- Delete codes permanently

### 6. Activity Logs (`/admin/activity-logs`)
**Tracked Events:**
- User registrations
- User logins
- Room creations
- Slot reservations
- Gift code redemptions
- User suspensions
- Room suspensions

**Features:**
- Filter by activity type
- View detailed metadata
- Export logs to JSON
- Timestamp for all events
- User email tracking

### 7. Settings & System Management (`/admin/settings`)

**API Authentication:**
- Configure admin secret key
- Local storage management

**System Health:**
- Database connection check
- View database name
- List all collections
- Real-time status monitoring

**Data Management:**
- **Export All Data**: Download complete backup in JSON format
  - Users (without password hashes in export)
  - Alliance rooms
  - Memberships
  - Slot reservations
  - Gift codes
  - Activity logs (last 1000)
  
- **Clear Old Logs**: Remove activity logs older than 30 days
  - Frees database space
  - Permanent deletion with confirmation

**Danger Zone:**
- Information about destructive actions
- Safety reminders
- Backup recommendations

## Security Features

### User Suspension System
- Automatic expiry checking
- Suspended users cannot:
  - Perform actions
  - Access protected resources
  - Join/create alliance rooms
  - Reserve SVS slots
- Middleware automatically unsuspends when timer expires

### Room Suspension System
- Prevents room access when suspended
- Members cannot send messages
- Automatic expiry like user suspension

### Admin Action Logging
- All admin actions are tracked
- Full audit trail available
- User identification for accountability

## API Endpoints

### Statistics
- `GET /admin/stats` - Get dashboard statistics

### User Management
- `GET /admin/users` - List all users with details
- `PUT /admin/users/:id` - Update user details
- `DELETE /admin/users/:id` - Delete user permanently

### Room Management
- `GET /admin/rooms` - List all rooms with members
- `PUT /admin/rooms/:code` - Update room details
- `DELETE /admin/rooms/:code` - Delete room permanently
- `GET /admin/rooms/:code/messages` - Get message count

### Slot Management
- `GET /admin/slots` - List all slot reservations grouped by state
- `DELETE /admin/slots/:id` - Delete slot reservation

### Gift Code Management
- `GET /admin/gift/codes/all` - List all gift codes
- `POST /admin/gift/codes` - Create new gift code
- `PUT /admin/gift/codes/:id` - Update gift code
- `DELETE /admin/gift/codes/:id` - Delete gift code

### Activity Logs
- `GET /admin/activity-logs?type=<type>&limit=<limit>` - Get activity logs

### System Operations
- `GET /admin/health-check` - Check system health
- `GET /admin/export-data` - Export all data
- `DELETE /admin/clear-old-logs` - Clear logs older than 30 days

## Database Models

### User Model Extensions
```typescript
{
  suspended: boolean
  suspendedUntil?: Date
}
```

### Alliance Room Model Extensions
```typescript
{
  suspended: boolean
  suspendedUntil?: Date
}
```

### Activity Log Model
```typescript
{
  type: 'user_register' | 'user_login' | 'room_create' | 'slot_reserve' | 'gift_redeem' | 'user_suspend' | 'room_suspend'
  userId?: ObjectId
  userEmail: string
  details: string
  metadata?: Record<string, any>
  timestamp: Date
}
```

## Best Practices

1. **Regular Backups**: Export data regularly before major operations
2. **Monitor Activity Logs**: Check for suspicious activities
3. **Suspension Before Deletion**: Try suspending problematic users before permanent deletion
4. **Clear Old Logs**: Periodically clean up logs to maintain performance
5. **Secure Admin Secret**: Never share or expose the admin secret
6. **Health Checks**: Regularly verify system health
7. **Review Statistics**: Use dashboard to monitor growth and issues

## Future Enhancements (Recommended)

1. **Bulk Operations**: Select and manage multiple users/rooms at once
2. **Advanced Filters**: More granular filtering options
3. **Analytics Dashboard**: Graphs and charts for trends
4. **Email Notifications**: Alert admins of critical events
5. **Role-Based Admin Access**: Multiple admin levels with different permissions
6. **Scheduled Tasks**: Automatic cleanup and maintenance
7. **IP Ban Management**: Block malicious IP addresses
8. **Rate Limiting Dashboard**: Monitor and manage API rate limits
9. **Database Backup Scheduling**: Automated backup creation
10. **User Communication**: Send announcements or warnings to users

## Troubleshooting

### Cannot Access Admin Panel
- Verify admin secret matches server `ADMIN_SECRET`
- Check if secret is properly saved in Settings
- Ensure you're logged in as admin

### Statistics Not Loading
- Verify admin secret is set
- Check network connection
- Verify server is running and database is connected

### Suspension Not Working
- Check suspension expiry date
- Verify middleware is properly applied to routes
- Check database for suspension fields

### Data Export Failing
- Check available disk space
- Verify database connection
- Try smaller data sets if timeout occurs

## Support & Maintenance

For technical issues or feature requests:
1. Check activity logs for error details
2. Run health check to verify system status
3. Review server logs for backend errors
4. Contact system administrator with specific error messages

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-09  
**Maintained By**: WOS-DAWN Admin Team
