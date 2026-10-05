# subscribe/

The current search as a calendar subscription: each matching class at its real time, with when
booking opens in its notes. The feed itself is the server's `/calendar.ics` (`deploy/calendar.ts`).

- `SubscribeButton.tsx`: "Subscribe" beside the result count; enabled once every club has loaded.
- `SubscribeSheet.tsx`: the search in words, classes per week, Apple / Google / copy-link. A busy
  search gets a nudge to narrow it down; one too big for a calendar (over 300 classes) can't be
  subscribed.
- `subscribe.ts`: the feed's links (`webcal://`, Google's "add by URL", plain https) and who can
  reach a preview: this computer only, or devices on this network.
