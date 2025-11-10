# Support Ticket System - Complete Guide

## Overview
A comprehensive support ticket system has been implemented to allow users to contact admins, report issues, report users, request features, and track their requests. Admins can view all tickets, add remarks, update status/priority, and manage the entire support workflow.

## Features

### For Users
1. **Create Tickets** - Submit support requests with various types:
   - Report User (with user email field)
   - Report Issue
   - Feature Request
   - Account Issue
   - Technical Support
   - Other

2. **View Tickets** - See all submitted tickets with:
   - Current status (Pending, In Progress, Resolved, Closed, Rejected)
   - Priority level
   - Admin remarks
   - Submission date

3. **Track Status** - Real-time updates on ticket progress

### For Admins
1. **View All Tickets** - Complete ticket overview with:
   - Advanced filtering (status, type, search)
   - Statistics dashboard
   - User information

2. **Manage Tickets**:
   - Update status (Pending → In Progress → Resolved → Closed)
   - Set priority (Low, Medium, High, Critical)
   - Add remarks (visible to users)
   - Delete tickets

3. **Statistics** - Real-time metrics:
   - Total tickets
   - Tickets by status
   - Tickets by type

## File Structure

### Backend
```
server/src/
├── models/
│   └── SupportTicket.ts         # Ticket schema definition
├── routes/
│   ├── support.ts               # User ticket endpoints
│   └── admin.ts                 # Admin ticket management (updated)
└── index.ts                     # Route registration (updated)
```

### Frontend
```
client/src/
├── components/
│   └── Sidebar.tsx              # Added Contact Admin link
├── pages/
│   └── ContactAdmin.tsx         # User ticket interface
├── admin/
│   ├── AdminSidebar.tsx         # Added Support Tickets link
│   ├── pages/
│   │   └── SupportTickets.tsx   # Admin ticket management
│   └── AdminApp.tsx             # Route registration (updated)
└── pages/
    └── Dashboard.tsx            # Route registration (updated)
```

## API Endpoints

### User Endpoints (`/api/support`)
- `POST /tickets` - Create a new ticket
- `GET /tickets` - Get all tickets for the logged-in user
- `GET /tickets/:id` - Get a specific ticket with admin remarks
- `GET /tickets/stats/summary` - Get ticket statistics for the user

### Admin Endpoints (`/api/admin/support`)
- `GET /tickets` - Get all tickets (with filters)
- `GET /stats` - Get system-wide ticket statistics
- `GET /tickets/:id` - Get ticket details with populated user data
- `PUT /tickets/:id/status` - Update ticket status and/or priority
- `POST /tickets/:id/remarks` - Add admin remarks
- `DELETE /tickets/:id` - Delete a ticket

## Usage

### As a User

1. **Navigate to Contact Admin**
   - Click "Contact Admin" in the sidebar (headphones icon)

2. **Create a Ticket**
   - Click "New Ticket" tab
   - Select ticket type from the 6 available options
   - If reporting a user, enter their email address
   - Enter subject (max 200 characters)
   - Write detailed message (max 2000 characters)
   - Click "Submit Ticket"

3. **View Your Tickets**
   - Click "My Tickets" tab
   - See all your submitted tickets with status badges
   - Click any ticket to view details and admin remarks

### As an Admin

1. **Navigate to Support Tickets**
   - Click "Support Tickets" in the admin sidebar

2. **View Statistics**
   - Dashboard shows real-time ticket counts by status

3. **Filter Tickets**
   - Use search bar to find tickets by subject, message, email, or ID
   - Filter by status (All, Pending, In Progress, etc.)
   - Filter by type (Report User, Report Issue, etc.)

4. **Manage a Ticket**
   - Click any ticket to open detail modal
   - Update status using dropdown
   - Set priority level
   - Add remarks that users can see
   - Delete ticket if needed

## Ticket Workflow

### Typical Lifecycle
1. **User Creates Ticket** → Status: `pending`
2. **Admin Reviews** → Status: `in_progress`
3. **Admin Resolves Issue** → Status: `resolved`
4. **Admin Adds Final Remark** → Status: `closed`

### Alternative Outcomes
- **Rejected** - Invalid or spam tickets
- **Closed** - Ticket completed without resolution

## Data Model

### SupportTicket Schema
```typescript
{
  userId: ObjectId,           // User who created the ticket
  type: TicketType,          // Ticket category
  subject: string,           // Brief description
  message: string,           // Detailed message
  status: TicketStatus,      // Current status
  priority: TicketPriority,  // Priority level (optional)
  reportedUserId: ObjectId,  // For report_user type (optional)
  reportedUserEmail: string, // Email of reported user (optional)
  adminRemarks: [{
    message: string,
    addedBy: string,         // Admin email
    addedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Access Control

### User Access
- Users can only see their own tickets
- Users can create tickets when authenticated
- Users receive all admin remarks

### Admin Access
- Admins see all tickets from all users
- Admins can update status and priority
- Admins can add remarks
- Admins can delete tickets
- Requires `isAdmin: true` flag and authentication

## Security Features

1. **Authentication Required** - All endpoints require valid JWT token
2. **User Isolation** - Users only access their own tickets
3. **Admin Authorization** - Admin endpoints check `requireAdmin` middleware
4. **Input Validation** - Max lengths enforced on all text fields
5. **Email Verification** - Reported user emails are stored for admin review

## Testing Checklist

### User Flow
- [ ] Create ticket with all 6 types
- [ ] Create report_user ticket (requires email field)
- [ ] View ticket list
- [ ] Click ticket to see details
- [ ] See admin remarks when added
- [ ] Verify status updates appear

### Admin Flow
- [ ] View all tickets from all users
- [ ] Use search functionality
- [ ] Filter by status
- [ ] Filter by type
- [ ] Update ticket status
- [ ] Change priority level
- [ ] Add admin remarks
- [ ] Delete ticket
- [ ] Verify statistics update

## UI Features

### User Interface
- **Smart Form** - Dynamic field for report_user type
- **Character Counters** - Real-time feedback on text limits
- **Status Badges** - Color-coded status indicators
- **Priority Labels** - Visual priority levels
- **Responsive Design** - Mobile-friendly layout
- **Modal Details** - Full-screen ticket viewer

### Admin Interface
- **Dashboard Statistics** - 6 stat cards with counts
- **Advanced Filters** - Search, status, and type filters
- **Quick Actions** - Inline status and priority updates
- **Remark System** - Add remarks with timestamp
- **Bulk View** - Efficient ticket list with key info
- **Modal Management** - Detailed ticket viewer with all actions

## Notifications

### User Notifications
- Success message on ticket submission
- Real-time status updates visible in ticket list
- Admin remarks appear immediately in ticket details

### Admin Notifications
- Pending ticket count in navigation (optional enhancement)
- New ticket indicators (optional enhancement)

## Best Practices

### For Users
1. Choose the correct ticket type for faster resolution
2. Provide detailed information in the message
3. Check back regularly for admin remarks
4. Keep subject concise but descriptive

### For Admins
1. Update status promptly to keep users informed
2. Add clear remarks explaining actions taken
3. Set appropriate priority levels
4. Use search and filters to manage high volumes
5. Delete spam/invalid tickets to keep the system clean

## Future Enhancements

### Potential Improvements
1. Real-time notifications (WebSocket/Pusher)
2. Email notifications on status changes
3. File attachment support
4. Ticket assignment to specific admins
5. Internal notes (not visible to users)
6. Ticket templates for common issues
7. SLA tracking and escalation
8. Ticket categorization tags
9. Batch operations (bulk status update)
10. Export tickets to CSV/PDF

## Troubleshooting

### Common Issues

**Tickets not loading:**
- Check authentication token
- Verify API endpoint connectivity
- Check browser console for errors

**Cannot create ticket:**
- Verify all required fields are filled
- Check character limits
- Ensure user is authenticated

**Admin can't see tickets:**
- Verify admin status (`isAdmin: true`)
- Check admin authentication
- Verify route registration in index.ts

**Remarks not appearing:**
- Refresh ticket details
- Check API response in network tab
- Verify remark was successfully added

## Environment Variables

No new environment variables required. Uses existing:
- `JWT_SECRET` - For authentication
- `MONGODB_URI` - For database connection
- `ADMIN_EMAIL` - For admin identification
- `ADMIN_PASSWORD` - For admin authentication

## Database Indexes (Recommended)

For optimal performance with large ticket volumes:

```javascript
// On SupportTicket collection
db.supporttickets.createIndex({ userId: 1, createdAt: -1 });
db.supporttickets.createIndex({ status: 1, createdAt: -1 });
db.supporttickets.createIndex({ type: 1, createdAt: -1 });
db.supporttickets.createIndex({ createdAt: -1 });
```

## Support

For issues or questions about the support ticket system:
1. Check this documentation
2. Review the code comments
3. Test with the admin account
4. Check server logs for errors

---

**Implementation Date:** January 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
