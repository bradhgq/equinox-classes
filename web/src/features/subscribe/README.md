# subscribe/

The current search as a calendar subscription: an event, and alert, the moment booking opens for
each matching class. The feed itself is the server's `/calendar.ics` (`deploy/calendar.ts`).

- `SubscribeButton.tsx`: "Subscribe" beside the result count; enabled once every club has loaded.
- `SubscribeSheet.tsx`: the search in words, alerts per week, Apple / Google / copy-link. A busy
  search gets a nudge to narrow it down; one too big for a calendar (over 300 classes) can't be
  subscribed.
- `subscribe.ts`: the feed's links (`webcal://`, Google's "add by URL", plain https) and the
  local-preview check.
