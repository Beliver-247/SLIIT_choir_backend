# Admin & Moderator User Setup Guide

## Overview
This guide explains how to set up admin and moderator users in the SLIIT Choir backend so you can test the event creation functionality.

## Backend Setup

### 1. Create Admin/Moderator Users in Database

You need to create admin and moderator test users in your MongoDB database. You have two options:

#### **Option A: Using MongoDB Atlas/Compass**

1. Connect to your MongoDB database
2. Go to the `members` collection
3. Insert a new document with admin role:

```json
{
  "firstName": "Admin",
  "lastName": "User",
  "studentId": "AD00000001",
  "email": "admin@sliitchoir.com",
  "password": "admin123",
  "role": "admin",
  "status": "active",
  "memberSince": "2024-01-01T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Note:** The password will be automatically hashed when saved through the registration endpoint.

#### **Option B: Using Node.js Script**

Create a file `scripts/createAdminUser.js` in your backend:

```javascript
import mongoose from 'mongoose';
import Member from './models/Member.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const admin = new Member({
      firstName: 'Admin',
      lastName: 'User',
      studentId: 'AD00000001',
      email: 'admin@sliitchoir.com',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@sliitchoir.com');
    console.log('StudentID: AD00000001');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
```

Run with:
```bash
node scripts/createAdminUser.js
```

#### **Option C: Through Registration API**

Call the registration endpoint to create users:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "studentId": "AD00000001",
    "email": "admin@sliitchoir.com",
    "password": "admin123",
    "confirmPassword": "admin123"
  }'
```

Then update the role in MongoDB to "admin" or "moderator".

### 2. Test Credentials

Create multiple test users:

#### **Admin User**
- **StudentID:** AD00000001
- **Email:** admin@sliitchoir.com
- **Password:** admin123
- **Role:** admin

#### **Moderator User**
- **StudentID:** MD00000001
- **Email:** moderator@sliitchoir.com
- **Password:** moderator123
- **Role:** moderator

#### **Regular Member User**
- **StudentID:** CS12345678
- **Email:** member@sliitchoir.com
- **Password:** member123
- **Role:** member

## Testing the Event Creation Feature

### Step 1: Backend Server Running
Ensure your backend is running:
```bash
cd SLIIT_choir_backend
npm start
```

Should be accessible at: `http://localhost:5000`

### Step 2: Frontend Server Running
Ensure your frontend is running:
```bash
cd SLIIT_choir_frontend
npm run dev
```

Should be accessible at: `http://localhost:5173` (or similar)

### Step 3: Login as Admin/Moderator
1. Open the application in your browser
2. Click "Members Login" button
3. Enter credentials:
   - **StudentID:** AD00000001
   - **Password:** admin123
4. Click "Login"

### Step 4: Navigate to Event Creation
1. After successful login, you'll be in the Members Portal
2. In the navigation bar, you should see a green "Create Event" button (with a + icon)
3. Click on it

### Step 5: Create an Event
Fill in the form:
- **Event Title:** "Annual Choir Concert 2025"
- **Description:** "Join us for our annual concert!"
- **Event Date:** 2025-12-20
- **Event Time:** 18:30
- **Location:** "SLIIT Auditorium, Malabe"
- **Event Type:** Performance
- **Capacity:** 500
- **Image URL:** (optional)

Click "Create Event"

### Step 6: Verify Event Creation
1. You should see a success message
2. You'll be redirected to the Members Portal
3. Check the Events page to see your newly created event

## Verification Checklist

- [ ] Admin user can log in successfully
- [ ] Moderator user can log in successfully
- [ ] Admin user sees "Create Event" button in Members Portal
- [ ] Moderator user sees "Create Event" button in Members Portal
- [ ] Regular member does NOT see "Create Event" button
- [ ] Admin can fill and submit event creation form
- [ ] Event appears in the events list after creation
- [ ] Form validates empty required fields
- [ ] Form prevents selecting past dates
- [ ] Success message displays after event creation

## Database Schema

The Member model includes a `role` field:

```javascript
role: {
  type: String,
  enum: ['member', 'moderator', 'admin'],
  default: 'member'
}
```

To change an existing user's role in MongoDB:

```javascript
db.members.updateOne(
  { studentId: "CS12345678" },
  { $set: { role: "admin" } }
)
```

## Environment Variables

Ensure your backend `.env` file has:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sliit_choir
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

## Common Issues

### Issue: Login fails with "Invalid StudentID or password"
- **Solution:** Ensure the user exists in the database with correct credentials
- Check that password was set correctly

### Issue: "Create Event" button not visible
- **Solution:** Ensure the user's role is set to "admin" or "moderator"
- Check localStorage to verify the stored role is correct

### Issue: Event creation fails with 403 "Not authorized"
- **Solution:** Check that the JWT token includes the correct role
- Log out and log back in to get a fresh token

### Issue: Backend connection fails
- **Solution:** Ensure MongoDB URI is correct
- Check that MongoDB Atlas/local MongoDB is running
- Verify network access for Atlas cluster

## Next Steps

Once you've successfully created a few events as an admin:

1. **Test as Regular Member:**
   - Log out and log back in as a regular member
   - Verify they can see created events but cannot create new ones
   - Test event registration functionality

2. **Create Multiple Events:**
   - Create events with different types
   - Test filtering and sorting on the Events page

3. **Event Management (Future):**
   - Plan implementation of event editing
   - Plan implementation of event deletion
   - Add event management dashboard

---

**Version:** 1.0  
**Last Updated:** November 17, 2025
