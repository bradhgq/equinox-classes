# share/

- `share.ts`: builds the share URL and sentence. Phones and tablets get the system share sheet
  (sentence + link); desktops copy just the link.
- `ShareFallback.tsx`: when sharing and copying both fail, a sheet with the link selected for manual copy.
- `SharedBanner.tsx`: "Showing a shared search" with KEEP / CLEAR (or ✕ on a first visit).
