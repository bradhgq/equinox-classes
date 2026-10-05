# detail/

- `ClassDetail.tsx`: in-app class detail (sheet, or drawer on desktop): facts, description, booking time, "Book on Equinox ↗", reminder.
- `BookingActions.tsx`: the detail's buttons, ordered by booking state: Remind first before booking opens, Book first once it's open, only "View on Equinox" for a cancelled or started class.
- `reminder.ts`: builds the "Book: …" calendar event that fires when booking opens (.ics or Google Calendar).
