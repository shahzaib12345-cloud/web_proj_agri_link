# Security notes

No real API key or secret was found in the original project, and none exists in this one. Do not add any to client code.

## What the frontend does

- Access token held in memory (`src/api/tokenStore.ts`); single-flight refresh on 401; logout clears it.
- `credentials: 'include'` so an httpOnly refresh cookie can be used. No token in localStorage/sessionStorage (mock mode keeps
  a fake session in sessionStorage inside `src/mocks` only, and that code is not in production builds).
- Role-based routes are a UX convenience only. **They are not authorization.**
- Text is always rendered as text. Image URLs are validated (`/images/...` or `https://`). Referrer policy set.

## What the Express API MUST enforce (the frontend cannot)

1. Derive role and user id from the verified JWT; ignore any role/id/name/phone/location in request bodies. Reject `role=admin` at registration.
2. Ownership checks on listing delete, offer actions, rating and price alerts; scope `GET /offers`, `/listings/mine`, `/price-alerts` to the caller.
3. All `/admin/*` and price/article writes admin-only.
4. Offer state machine (pending -> accepted/rejected/countered -> completed; only the farmer completes) and server-computed totals.
5. Rating averages computed server-side; one rating per completed offer, only by that buyer.
6. Do not return phone numbers on public listings; return counterpart phones only on accepted/completed offers.
7. Hash passwords (argon2/bcrypt), rate-limit login/registration, generic login errors, short-lived access tokens, rotating refresh tokens.
8. Proxy weather: keep the provider key on the server (`GET /weather?district=`).
9. Validate and bound every field again server-side (limits are in `src/utils/validators.ts`).
10. Bilingual content: return both languages or a language field for articles and weather advisories.

## Manual actions for the owner

- Host headers: `Content-Security-Policy` (no inline scripts; allow fonts.googleapis.com / fonts.gstatic.com unless fonts are self-hosted),
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`, `Permissions-Policy`.
- Express CORS: exact-origin allowlist (no `*` with credentials); cookie `HttpOnly; Secure; SameSite`.
- Self-host fonts (privacy and CSP) when convenient.
- Tailwind 4 needs Chrome 111+ / Safari 16.4+; confirm that fits the target phones.
- If any key was ever committed or shared from the original project, rotate it.
