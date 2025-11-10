# Support Ticket System - Quick Reference

## 🎯 What Was Added

A complete support ticket system for user-admin communication with:
- **6 ticket types** (Report User, Report Issue, Feature Request, Account Issue, Technical Support, Other)
- **5 status levels** (Pending, In Progress, Resolved, Closed, Rejected)
- **4 priority levels** (Low, Medium, High, Critical)
- **Admin remark system** for communication
- **Advanced filtering** and search
- **Real-time statistics**

## 📂 Files Created

### Backend
- `server/src/models/SupportTicket.ts` - Database schema
- `server/src/routes/support.ts` - User endpoints

### Frontend
- `client/src/pages/ContactAdmin.tsx` - User interface
- `client/src/admin/pages/SupportTickets.tsx` - Admin interface

## 📝 Files Modified

### Backend
- `server/src/routes/admin.ts` - Added admin ticket management endpoints
- `server/src/index.ts` - Registered support routes

### Frontend
- `client/src/components/Sidebar.tsx` - Added "Contact Admin" link
- `client/src/admin/AdminSidebar.tsx` - Added "Support Tickets" link
- `client/src/pages/Dashboard.tsx` - Added ContactAdmin route
- `client/src/admin/AdminApp.tsx` - Added SupportTickets route

## 🔗 Routes

### User Routes (`/api/support`)
```
POST   /tickets              Create ticket
GET    /tickets              List user's tickets
GET    /tickets/:id          View ticket details
GET    /tickets/stats/summary User statistics
```

### Admin Routes (`/api/admin/support`)
```
GET    /tickets              List all tickets (with filters)
GET    /stats                System statistics
GET    /tickets/:id          View ticket details
PUT    /tickets/:id/status   Update status/priority
POST   /tickets/:id/remarks  Add admin remark
DELETE /tickets/:id          Delete ticket
```

## 🎨 UI Locations

### User Side
**Path:** `/dashboard/contact-admin`
**Navigation:** User Sidebar → Utilities → "Contact Admin" (headphones icon)

### Admin Side
**Path:** `/admin/support-tickets`
**Navigation:** Admin Sidebar → "Support Tickets" (headphones icon)

## ⚡ Key Features

### For Users
✅ Create tickets with smart form (dynamic fields based on type)  
✅ View all submitted tickets with status badges  
✅ See admin remarks and responses  
✅ Track ticket progress with color-coded statuses  
✅ Character counters for subject/message  

### For Admins
✅ Dashboard with 6 statistics cards  
✅ Search tickets by subject, message, email, or ID  
✅ Filter by status and type  
✅ Quick status and priority updates  
✅ Add remarks visible to users  
✅ Delete spam/invalid tickets  
✅ View full user details  

## 🔐 Security

- ✅ Authentication required (JWT)
- ✅ Users only see their own tickets
- ✅ Admin-only access to management features
- ✅ Input validation and character limits
- ✅ Protected endpoints with middleware

## 🚀 Testing

### Quick Test Flow

1. **Start servers:**
   ```bash
   # Terminal 1
   cd server && npm run dev
   
   # Terminal 2
   cd client && npm run dev
   ```

2. **Test as User:**
   - Login as regular user
   - Navigate to Contact Admin
   - Create a ticket (try different types)
   - View ticket list

3. **Test as Admin:**
   - Login as admin (admin@wos.com / Hybrid123)
   - Navigate to Support Tickets
   - View statistics
   - Filter tickets
   - Click ticket to manage
   - Add remark
   - Update status
   - Change priority

## 📊 Ticket Workflow

```
User Creates → [PENDING]
      ↓
Admin Reviews → [IN_PROGRESS]
      ↓
Admin Acts → [RESOLVED]
      ↓
Final Close → [CLOSED]

Alternative: [REJECTED] for spam/invalid
```

## 🎨 Status Colors

- 🟡 **Pending** - Yellow (awaiting admin review)
- 🔵 **In Progress** - Blue (admin is working on it)
- 🟢 **Resolved** - Green (issue fixed)
- ⚫ **Closed** - Gray (completed)
- 🔴 **Rejected** - Red (invalid/spam)

## 📋 Ticket Types

1. **Report User** - Report inappropriate behavior (requires user email)
2. **Report Issue** - Report bugs or problems
3. **Feature Request** - Suggest improvements
4. **Account Issue** - Account-related problems
5. **Technical Support** - Technical help needed
6. **Other** - Anything else

## 💡 Tips

### For Users
- Choose correct ticket type for faster resolution
- Provide detailed information
- Check back for admin remarks

### For Admins
- Update status promptly
- Add clear remarks
- Set appropriate priorities
- Use search for efficiency
- Delete spam to keep system clean

## 🐛 Troubleshooting

**Tickets not loading?**
- Check authentication
- Verify server is running
- Check browser console

**Can't create ticket?**
- Fill all required fields
- Check character limits
- Verify authentication

**Admin can't see tickets?**
- Verify isAdmin flag
- Check admin login
- Check server logs

## 📦 Dependencies

No new dependencies required! Uses existing:
- Express for routing
- Mongoose for database
- JWT for authentication
- React for UI
- Lucide React for icons

## ✅ Completion Checklist

- [x] Backend models created
- [x] User API endpoints implemented
- [x] Admin API endpoints implemented
- [x] Routes registered in server
- [x] User UI created
- [x] Admin UI created
- [x] Navigation links added
- [x] Routes registered in client
- [x] Authentication working
- [x] Authorization working
- [x] Filters working
- [x] Search working
- [x] Status updates working
- [x] Remarks working
- [x] Statistics working
- [x] Delete working
- [x] Documentation complete

## 🎉 Status: COMPLETE & READY TO USE!

---

**Quick Access:**
- Full Documentation: `SUPPORT_TICKET_SYSTEM.md`
- User Interface: http://localhost:5173/dashboard/contact-admin
- Admin Interface: http://localhost:5173/admin/support-tickets
- API Base: http://localhost:4000/api
