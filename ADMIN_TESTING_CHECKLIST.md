# Admin Dashboard Testing Checklist

## Pre-Testing Setup

### 1. Environment Variables
- [ ] `ADMIN_SECRET` is set in `.env` file
- [ ] `MONGODB_URI` is configured
- [ ] `JWT_SECRET` is set
- [ ] Server is running on correct port

### 2. Database Setup
- [ ] MongoDB is running
- [ ] Database connection is established
- [ ] Collections are created

### 3. Admin Access
- [ ] Admin secret is configured in Settings page
- [ ] Secret matches server `ADMIN_SECRET`
- [ ] Can access admin routes

## Dashboard Overview Testing

### Visual Elements
- [ ] Page loads without errors
- [ ] All 4 stat cards are visible (Users, Rooms, Slots, Gift Codes)
- [ ] Gradient backgrounds render correctly
- [ ] Icons display properly
- [ ] Refresh button is visible and clickable

### Data Display
- [ ] User count shows correct total
- [ ] Active/Suspended user breakdown is accurate
- [ ] Alliance rooms count is correct
- [ ] SVS slots count matches database
- [ ] Gift codes count is accurate
- [ ] Active/Inactive gift codes ratio is correct

### Recent Activity Section
- [ ] Recent users list displays (if users exist)
- [ ] User avatars show first letter of email
- [ ] Creation dates are formatted correctly
- [ ] Recent rooms list displays (if rooms exist)
- [ ] Room codes and names are visible
- [ ] State numbers are shown

### System Status
- [ ] All 4 status indicators show green
- [ ] Database status shows "Connected"
- [ ] API status shows "Online"
- [ ] Authentication shows "Active"
- [ ] Admin panel shows "Monitoring"

### Interactions
- [ ] Clicking "View all" on Users card navigates to /admin/users
- [ ] Clicking "Manage" on Rooms card navigates to /admin/rooms
- [ ] Clicking "View all" on Slots card navigates to /admin/slots
- [ ] Clicking "Manage" on Gift Codes navigates to /admin/gift-codes
- [ ] Refresh button reloads all data
- [ ] Loading spinner appears during refresh

## User Management Testing

### User List
- [ ] All registered users appear in list
- [ ] Email addresses are visible
- [ ] Creation/Update dates are formatted
- [ ] Suspended status is indicated
- [ ] Automation status is shown
- [ ] Search functionality works

### User Details
- [ ] Clicking "Details" expands user info
- [ ] Password hash is hidden by default
- [ ] Show/Hide password toggle works
- [ ] Game ID and Name display if set
- [ ] Suspension dates show if applicable

### User Editing
- [ ] Edit button opens edit form
- [ ] Can modify email address
- [ ] Can change password
- [ ] Can update Game ID/Name
- [ ] Can toggle automation
- [ ] Can set suspension status
- [ ] Save button updates database
- [ ] Cancel button discards changes

### User Suspension
- [ ] Quick suspend buttons appear (24h, 3d, 7d, 30d)
- [ ] Clicking suspend sets expiry date
- [ ] Suspended badge appears
- [ ] Unsuspend button works
- [ ] Automatic unsuspend on expiry works

### User Deletion
- [ ] Delete button shows confirmation
- [ ] Deletion removes user from database
- [ ] Cascading delete removes:
  - [ ] Alliance memberships
  - [ ] Slot reservations
  - [ ] Owned rooms
  - [ ] Room members
  - [ ] Room messages

## Alliance Room Management Testing

### Room List
- [ ] All alliance rooms display
- [ ] Room codes are visible
- [ ] Room names are shown
- [ ] State numbers display
- [ ] Owner emails are correct
- [ ] Member counts are accurate
- [ ] Suspension status is indicated

### Room Details
- [ ] Clicking "Details" expands room info
- [ ] Member list displays
- [ ] Member roles are shown (owner/member)
- [ ] Join dates are formatted
- [ ] Message count loads correctly

### Room Editing
- [ ] Edit button opens edit form
- [ ] Can change room name
- [ ] Can update state number
- [ ] Can set suspension
- [ ] Save button updates database

### Room Suspension
- [ ] Quick suspend buttons work (24h, 3d, 7d)
- [ ] Suspended badge appears
- [ ] Unsuspend button works

### Room Deletion
- [ ] Delete button shows confirmation
- [ ] Deletion removes room
- [ ] Cascading delete removes:
  - [ ] All memberships
  - [ ] All messages

## SVS Slot Management Testing

### Slot Display
- [ ] Slots grouped by state
- [ ] Reservation counts are accurate
- [ ] State dropdown works
- [ ] Details expand/collapse

### Slot Details
- [ ] Date shows correctly
- [ ] Slot index (0-47) displays
- [ ] Alliance name is visible
- [ ] Player name shows if set
- [ ] Game ID shows if set
- [ ] Reserved by email is correct
- [ ] Creation date is formatted

### Slot Management
- [ ] Individual slot delete works
- [ ] Clear state button removes all slots
- [ ] Refresh updates data

## Gift Code Management Testing

### Code Display
- [ ] All gift codes listed
- [ ] Code strings are visible
- [ ] Active/Inactive status correct
- [ ] Expiration dates formatted

### Code Creation
- [ ] Can create new code
- [ ] Can set expiration date
- [ ] Active by default
- [ ] Codes save to database

### Code Management
- [ ] Enable/Disable toggle works
- [ ] Delete removes from database
- [ ] Updates reflect immediately

## Activity Logs Testing

### Log Display
- [ ] Activity logs load
- [ ] Filter buttons work
- [ ] Timestamps are correct
- [ ] User emails display
- [ ] Activity types are color-coded

### Log Filtering
- [ ] "All Activity" shows everything
- [ ] "Registrations" filters correctly
- [ ] "Logins" filters correctly
- [ ] "Rooms" filters correctly
- [ ] "Slots" filters correctly
- [ ] "Redemptions" filters correctly

### Log Export
- [ ] Export JSON button works
- [ ] File downloads correctly
- [ ] JSON format is valid
- [ ] All log data included

## Settings Testing

### Admin Secret
- [ ] Secret input field works
- [ ] Save button stores secret
- [ ] Secret persists in localStorage
- [ ] Secret is used in API calls

### System Health
- [ ] Health check button works
- [ ] Database status displays
- [ ] Collection names shown
- [ ] Timestamp is current

### Data Management
- [ ] Export data button works
- [ ] JSON download completes
- [ ] All collections included
- [ ] Clear old logs works
- [ ] Confirmation dialog appears

## Sidebar Navigation Testing

### Visual Elements
- [ ] WOS-DAWN logo displays
- [ ] All menu items visible
- [ ] Icons render correctly
- [ ] Active state highlights
- [ ] Hover effects work

### Navigation
- [ ] Overview link works
- [ ] Users link works
- [ ] Rooms link works
- [ ] Gift Codes link works
- [ ] Slots link works
- [ ] Activity Logs link works
- [ ] Settings link works
- [ ] Logout button works

## Responsive Design Testing

### Desktop (>1024px)
- [ ] Sidebar is visible
- [ ] All cards display in grid
- [ ] No horizontal scroll
- [ ] All text is readable

### Tablet (768-1024px)
- [ ] Sidebar is visible
- [ ] Cards stack appropriately
- [ ] Touch targets are adequate
- [ ] Forms are usable

### Mobile (<768px)
- [ ] Sidebar is hidden (hamburger menu if implemented)
- [ ] Cards stack vertically
- [ ] Text remains readable
- [ ] Buttons are touch-friendly

## Performance Testing

### Load Times
- [ ] Dashboard loads under 2 seconds
- [ ] Stats API responds quickly
- [ ] No visible lag on interactions
- [ ] Smooth animations

### Data Handling
- [ ] Large user lists don't crash
- [ ] Many rooms load smoothly
- [ ] Pagination works if implemented
- [ ] Search is responsive

## Security Testing

### Authentication
- [ ] Cannot access without admin secret
- [ ] Invalid secret shows error
- [ ] Expired tokens are handled
- [ ] Logout clears session

### Authorization
- [ ] Admin endpoints require secret header
- [ ] Regular users cannot access admin panel
- [ ] CORS is configured correctly
- [ ] API rate limiting works

## Error Handling Testing

### Network Errors
- [ ] Lost connection shows error
- [ ] Retry mechanism works
- [ ] User gets helpful message
- [ ] App doesn't crash

### Invalid Data
- [ ] Empty states display correctly
- [ ] Null values are handled
- [ ] Invalid dates don't break UI
- [ ] Missing fields have fallbacks

### User Errors
- [ ] Invalid email shows error
- [ ] Weak passwords are rejected
- [ ] Duplicate entries prevented
- [ ] Form validation works

## Browser Compatibility

### Chrome/Edge
- [ ] All features work
- [ ] Gradients render
- [ ] Icons display

### Firefox
- [ ] All features work
- [ ] Gradients render
- [ ] Icons display

### Safari
- [ ] All features work
- [ ] Gradients render
- [ ] Icons display

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab order is logical
- [ ] All buttons are focusable
- [ ] Enter key submits forms
- [ ] Escape closes modals

### Screen Readers
- [ ] Labels are descriptive
- [ ] ARIA attributes present
- [ ] Alt text on images
- [ ] Status messages announced

### Visual
- [ ] Sufficient color contrast
- [ ] Text is scalable
- [ ] Focus indicators visible
- [ ] Error messages are clear

## Production Readiness

### Code Quality
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] Code is documented

### Documentation
- [ ] README is up to date
- [ ] API endpoints documented
- [ ] Admin features documented
- [ ] Troubleshooting guide exists

### Deployment
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL certificate configured
- [ ] Backup system in place

---

## Test Results Summary

**Date Tested**: _____________  
**Tested By**: _____________  
**Environment**: _____________

**Overall Status**: 
- [ ] ✅ All tests passed
- [ ] ⚠️ Minor issues found
- [ ] ❌ Critical issues found

**Notes**:
```
[Add any notes here]
```

**Action Items**:
1. 
2. 
3. 
