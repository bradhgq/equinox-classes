# systemd/

- `equinox-classes-download.service` + `.timer`: poll Equinox at 04:30 and 16:30 New York time and rebuild data (keeps every snapshot).
- `equinox-classes-web.service`: run `deploy/server.ts` on 127.0.0.1:8080.
