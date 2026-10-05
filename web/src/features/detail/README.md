# detail/

- `ClassDetail.tsx`: in-app class detail (sheet, or drawer on desktop): facts, description, booking time, "Book on Equinox ↗", reminder.
- `BookingActions.tsx`: the detail's buttons, ordered by booking state: Remind first before booking opens, Book first once it's open, only "View on Equinox" for a cancelled or started class. On phones, "Open the Equinox app" too (the app's home screen; a class-level app link isn't possible).
