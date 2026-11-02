# MedTravia Admin Dashboard

Responsive React admin interface for authenticated access to MedTravia patient enquiries.

## Routes

- `/admin/login` — administrator sign-in
- `/admin/dashboard` — protected enquiry dashboard

## Backend configuration

Copy `.env.example` to `.env` if these backend settings change. The frontend currently uses:

- `POST http://192.168.68.53:8080/api/admin/auth/login`
- `GET http://192.168.68.53:8080/api/admin/inquries?page=1&limit=20`

The login response must identify the user as an admin and provide either an access token or an authenticated cookie session. The enquiry service accepts `items`, `data`, or `enquiries` arrays and common snake_case/camelCase field variants.

Local development proxies `/api` through Vite to avoid port-specific CORS issues. Production should expose the backend through HTTPS when the dashboard itself is served over HTTPS; browsers block requests from an HTTPS frontend to an HTTP API.

Status changes and deletion are intentionally not included until matching protected backend endpoints exist.

## Commands

```bash
npm run dev
npm run build
npm run lint
```
