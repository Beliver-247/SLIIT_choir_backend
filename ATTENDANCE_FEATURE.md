# Attendance Feature Documentation

## Overview
The attendance feature allows moderators and admins to track attendance for both events and practice schedules, and provides comprehensive analytics and export capabilities.

## Database Models

### Attendance Model
```javascript
{
  eventId: ObjectId,              // Reference to Event (optional)
  scheduleId: ObjectId,           // Reference to PracticeSchedule (optional)
  memberId: ObjectId,             // Reference to Member (required)
  status: String,                 // 'present', 'absent', 'excused', 'late'
  markedBy: ObjectId,             // Reference to Member who marked attendance
  markedAt: Date,                 // When attendance was marked
  comments: String,               // Optional notes
  createdAt: Date,
  updatedAt: Date
}
```

### Event Model Updates
Added `attendance` field:
```javascript
attendance: [{
  memberId: ObjectId,
  status: String,                 // 'present', 'absent', 'excused', 'late'
  markedAt: Date,
  markedBy: ObjectId
}]
```

## API Endpoints

### 1. Mark Attendance
**POST** `/api/attendance/mark`

**Required Authentication:** Moderator or Admin

**Request Body:**
```json
{
  "memberId": "member_id",
  "eventId": "event_id",      // OR
  "scheduleId": "schedule_id",
  "status": "present|absent|excused|late",
  "comments": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Attendance record */ },
  "message": "Attendance marked successfully"
}
```

### 2. Get All Attendance Records
**GET** `/api/attendance/list`

**Required Authentication:** Moderator or Admin

**Query Parameters:**
- `eventId`: Filter by event
- `scheduleId`: Filter by schedule
- `memberId`: Filter by member
- `status`: Filter by attendance status
- `startDate`: Filter by date range (start)
- `endDate`: Filter by date range (end)
- `limit`: Results per page (default: 50)
- `page`: Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [ /* Array of attendance records */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

### 3. Get Event Attendance
**GET** `/api/attendance/event/:eventId`

**Required Authentication:** Moderator or Admin

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "memberId": "member_id",
      "name": "John Doe",
      "email": "john@example.com",
      "studentId": "CS12345678",
      "registered": true,
      "attendance": { /* Attendance record or null */ }
    }
  ],
  "totalRegistered": 50,
  "totalAttended": 45,
  "totalAbsent": 3,
  "totalExcused": 2,
  "totalLate": 0
}
```

### 4. Get Schedule Attendance
**GET** `/api/attendance/schedule/:scheduleId`

**Required Authentication:** Moderator or Admin

**Response:**
```json
{
  "success": true,
  "data": [ /* Array of attendance records */ ],
  "summary": {
    "total": 50,
    "present": 45,
    "absent": 3,
    "excused": 2,
    "late": 0
  }
}
```

### 5. Update Attendance Record
**PUT** `/api/attendance/:id`

**Required Authentication:** Moderator or Admin

**Request Body:**
```json
{
  "status": "present|absent|excused|late",
  "comments": "Updated notes"
}
```

### 6. Delete Attendance Record
**DELETE** `/api/attendance/:id`

**Required Authentication:** Moderator or Admin

### 7. Get Attendance Analytics
**GET** `/api/attendance/analytics`

**Required Authentication:** Moderator or Admin

**Query Parameters:**
- `startDate`: Analytics start date
- `endDate`: Analytics end date
- `memberId`: Filter by member
- `eventId`: Filter by event
- `scheduleId`: Filter by schedule

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 500,
      "byStatus": {
        "present": 450,
        "absent": 30,
        "excused": 15,
        "late": 5
      },
      "attendanceRate": "90.00"
    },
    "memberAnalytics": [
      {
        "memberId": "member_id",
        "name": "John Doe",
        "total": 10,
        "present": 9,
        "absent": 1,
        "excused": 0,
        "late": 0,
        "attendancePercentage": "90.00"
      }
    ],
    "dailyAnalytics": [
      {
        "date": "2025-11-18",
        "total": 50,
        "present": 45,
        "absent": 3,
        "excused": 2,
        "late": 0
      }
    ]
  }
}
```

### 8. Get Member Attendance History
**GET** `/api/attendance/member/:memberId`

**Authentication:** Any authenticated user (can view own history, admins/moderators can view others)

**Query Parameters:**
- `startDate`: Filter by date range (start)
- `endDate`: Filter by date range (end)
- `limit`: Results per page (default: 50)
- `page`: Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member_id",
      "name": "John Doe",
      "email": "john@example.com",
      "studentId": "CS12345678"
    },
    "attendance": [ /* Array of attendance records */ ],
    "stats": {
      "total": 20,
      "present": 18,
      "absent": 1,
      "excused": 1,
      "late": 0
    },
    "pagination": { /* Pagination info */ }
  }
}
```

### 9. Export Attendance to Excel
**GET** `/api/attendance/export/excel`

**Required Authentication:** Moderator or Admin

**Query Parameters:**
- `eventId`: Filter by event
- `scheduleId`: Filter by schedule
- `status`: Filter by attendance status
- `startDate`: Filter by date range (start)
- `endDate`: Filter by date range (end)
- `format`: Export format (currently only 'xlsx' supported)

**Response:** Downloads an Excel file with columns:
- First Name
- Last Name
- Email
- Student ID
- Event/Schedule Title
- Date
- Status
- Marked By
- Marked At
- Comments

## Usage Examples

### Taking Attendance for an Event
```bash
curl -X POST http://localhost:5000/api/attendance/mark \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event_id",
    "memberId": "member_id",
    "status": "present",
    "comments": "Arrived on time"
  }'
```

### Getting Event Attendance Summary
```bash
curl http://localhost:5000/api/attendance/event/event_id \
  -H "Authorization: Bearer <token>"
```

### Exporting Attendance to Excel
```bash
curl http://localhost:5000/api/attendance/export/excel?eventId=event_id \
  -H "Authorization: Bearer <token>" \
  -o attendance_report.xlsx
```

### Getting Analytics
```bash
curl 'http://localhost:5000/api/attendance/analytics?startDate=2025-11-01&endDate=2025-11-30' \
  -H "Authorization: Bearer <token>"
```

## Features

### 1. Attendance Marking
- Moderators and admins can mark attendance for both events and practice schedules
- Support for multiple statuses: present, absent, excused, late
- Optional comments for each attendance record
- Automatic update if marking attendance for the same member multiple times

### 2. Attendance Retrieval
- Get all attendance records with advanced filtering
- Get attendance summary for specific events or schedules
- Get member-specific attendance history
- Paginated results for large datasets

### 3. Analytics & Reports
- Overall attendance statistics (total, by status)
- Attendance rate calculation
- Per-member attendance analytics with percentage
- Daily attendance trends
- Customizable date range filtering

### 4. Excel Export
- Export attendance data to Excel (.xlsx) format
- Multiple columns with all relevant information
- Auto-adjusted column widths
- Automatic file cleanup after download
- Flexible filtering options

### 5. Security
- All endpoints require authentication (except public endpoints)
- Most endpoints restricted to moderators and admins
- Member attendance history can be viewed by the member themselves
- Audit trail via markedBy field

## Database Indexes
The Attendance model includes the following indexes for optimal query performance:
- `eventId + memberId`: Fast lookups for event-specific records
- `scheduleId + memberId`: Fast lookups for schedule-specific records
- `memberId`: Fast lookups for member history
- `markedAt`: Fast date-based queries

## Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad request (missing/invalid parameters)
- `404`: Resource not found
- `500`: Server error
- `401`: Unauthorized
- `403`: Forbidden

## Future Enhancements
- Bulk attendance marking
- Import attendance from CSV
- QR code scanning for attendance
- Mobile app integration
- Attendance notifications
- Export to PDF format
- Advanced data visualization
- Attendance predictions using ML
