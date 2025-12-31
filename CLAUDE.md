# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Calendly-style scheduling widget with n8n webhook backend, Google Calendar integration, Google Sheets storage, and email notifications.

## Architecture

- **Frontend**: Single-file HTML widget (`index.html`) with embedded CSS/JS
- **Backend**: n8n workflows for slot availability, booking, storage, and notifications
- **Calendar**: Google Calendar for availability checking and event creation
- **Storage**: Google Sheets for booking records
- **Notifications**: Gmail for customer confirmation and admin alerts
- **Libraries**: Tailwind CSS (CDN), Flatpickr (CDN)

## Business Rules

- **Business Hours**: 9:00 AM - 5:00 PM CST (UTC-6), Monday-Friday
- **Slot Duration**: 30 minutes
- **Last Bookable Slot**: 4:00 PM (to allow 30-min meeting before 5 PM)
- **Past Slot Filtering**: For today's date, slots that have already passed are not shown
- **Weekend Exclusion**: No slots available on Saturday/Sunday

## n8n Instance

**Base URL**: `https://n8n.srv902909.hstgr.cloud`

### Workflows

| Workflow | ID | Webhook Path | Method |
|----------|-----|--------------|--------|
| Calendar - Get Available Slots | `5AUhPSCig8wWXhdQ` | `/webhook/calendar-get-slots` | GET |
| Calendar - Book Slot | `BMvZ7IJHwXMTOoxk` | `/webhook/calendar-book-slot` | POST |

### GET Workflow Flow

```
Webhook → Prepare Date Query → Get Calendar Events → Filter Available Slots → Respond
```

- Queries Google Calendar for events in the requested date's business hours
- Filters out slots that conflict with existing calendar events
- Filters out past time slots if the requested date is today
- Returns available 30-minute slots

### POST (Booking) Workflow Flow

```
Webhook → Process Booking → Create Calendar Event → Google Sheets → [Email to Customer + Email to Admin] → Respond
```

- Creates a Google Calendar event for the booking
- Appends booking record to Google Sheets
- Sends confirmation email to customer
- Sends notification email to admin

## API Contract

**GET Available Slots**
```
GET /webhook/calendar-get-slots?date=YYYY-MM-DD
Response: { "availableSlots": ["09:00", "09:30", "10:00", ...] }
```

**POST Booking**
```
POST /webhook/calendar-book-slot
Content-Type: application/json
Body: { "date": "YYYY-MM-DD", "time": "HH:MM", "name": "...", "email": "..." }
Response: { "success": true, "message": "Booking confirmed", "booking": {...} }
```

## Integrations

### Google Calendar
- **Calendar**: `pierce1970@gmail.com`
- **Credential ID**: `gsi1OrnvIFHsn1Ho`
- **Operations**: Read events (GET workflow), Create events (POST workflow)

### Google Sheets
- **Spreadsheet**: `personal-calendar` (ID: `1-dqP6olAkMzFcjuVjkR1f-OKvxPo07rYNd32iXnKQTE`)
- **Sheet**: `bookings`
- **Columns**: Date, Time, Name, Email, BookedAt
- **Credential ID**: `5kWJaXVgdEBG0DQv`

### Email Notifications
- **Customer**: Confirmation sent to booker's email
- **Admin**: Notification sent to `matthew@metaphysicalevents.com`
- **Gmail Credential ID**: `nMkPXstjjqUOvUJe`

## Frontend Configuration

The `CONFIG` object in `index.html`:
```javascript
const CONFIG = {
    GET_SLOTS_URL: "https://n8n.srv902909.hstgr.cloud/webhook/calendar-get-slots",
    POST_BOOKING_URL: "https://n8n.srv902909.hstgr.cloud/webhook/calendar-book-slot",
    USE_MOCK_DATA: false,
    TITLE: "Schedule a Meeting",
    SUBTITLE: "Select a convenient time for your appointment",
    TIMEZONE: "CST",
    DISABLE_WEEKENDS: true
};
```

## n8n Technical Notes

### Expression Syntax
- Expressions must start with `=` to be evaluated (e.g., `={{ $json.field }}`)
- Reference other nodes: `$('Node Name').item.json.field`
- Current node data: `$json.field`

### Empty Results Handling
When a node returns 0 items (e.g., Google Calendar with no events), n8n stops workflow execution by default. To continue the flow:
- Add `"alwaysOutputData": true` to the node configuration
- This is applied to the "Get Calendar Events" node in the GET workflow

### Credential References
When updating workflows via API, ensure Google Calendar nodes use the correct credential:
```json
"credentials": {
  "googleCalendarOAuth2Api": {
    "id": "gsi1OrnvIFHsn1Ho",
    "name": "Google Calendar account"
  }
}
```
