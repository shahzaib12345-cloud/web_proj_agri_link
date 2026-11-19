# AgriLink API

Express + Mongoose REST API, mounted at `/api/v1`. Errors are always `{ "code": "<stable_code>" }`; the frontend
translates the code (`error.<code>` in `frontend/src/i18n`). Lists are `{ "items": [...] }`.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | public (rate limited) |
| POST | `/auth/refresh`, `/auth/logout` | refresh cookie (origin checked) |
| GET | `/auth/me` · PATCH `/users/me` | signed in |
| GET | `/listings` (public) · `/listings/mine` | public · farmer |
| POST | `/listings` · DELETE `/listings/:id` | farmer · farmer (own) / admin |
| GET/POST | `/offers` · PATCH `/offers/:id/status` · POST `/offers/:id/rating` | role-scoped (see below) |
| GET | `/prices` | public · PATCH/POST/DELETE admin |
| GET/POST/DELETE | `/price-alerts` | signed in (own) |
| GET/PUT/DELETE | `/favorites`, `/favorites/:id` | signed in |
| GET | `/weather?district=Multan&lang=en` | public (cached proxy). Returns `{ district, matched, items, current, source, stale, updatedAt }` |
| GET | `/weather/districts` | public. The districts a forecast exists for |
| GET | `/articles` · POST / DELETE `/articles/:id` | public · admin |
| GET/PATCH | `/admin/stats`, `/admin/users`, `/admin/users/:id/verification`, `/admin/listings`, `/admin/listings/:id/moderation` | admin |
| GET | `/health` | public (503 if DB down) |

## Offer state machine

`pending` → farmer: accept / reject / counter · `countered` → buyer: accept · `accepted` → farmer: complete.
Completing reduces listing stock; the listing stays live while at least the minimum order remains, else `sold`.
Transitions use compare-and-set so concurrent requests cannot both succeed.

## Security measures

bcrypt hashes; generic login errors + constant-time check for unknown phones; per-IP and per-IP+phone login limits;
hashed, rotating, per-device refresh tokens (httpOnly, path-scoped cookie); Origin check on cookie endpoints;
HS256-pinned JWTs; role and ownership from the database, never the client; strict type validation (no coercion);
Mongo operator-injection rejection; `helmet`; CORS allow-list; `Cache-Control: no-store`; 100 kB body limit;
no request bodies or credentials in logs; env validation that refuses weak/missing secrets.

## Weather

Open-Meteo is tried first and MET Norway second (`WEATHER_PROVIDERS`). A flaky provider gets one retry; a 4xx other
than 429 is not retried. Results are cached per district and language (`WEATHER_CACHE_MINUTES`, default 30). If every
provider fails, the last saved copy is served with `stale: true`; with nothing saved, `items` is empty and `source` is
`null`. The failure reasons (`timeout`, `enotfound`, `http_429`, ...) are written to the server log. `npm run
weather:check` runs the same providers from your machine and explains any failure. `rainProbPercent` is `null`
when a model gives no probability, never a made-up 0.

## Listing approval

`LISTING_APPROVAL` in `.env` decides whether a new listing is public at once (`off`), only for verified farmers
(`unverified`), or only after an admin approves it (`all`). Admins approve from the moderation tab. An unexpected
value stops the server at startup.

## Serving the React app

When `frontend/dist` exists, this server also serves it: hashed assets cached for a year, `index.html` always
revalidated, and unknown non-API paths return the app so client-side routes survive a refresh. Unknown `/api/...`
paths return a JSON 404. If there is no build, only the API runs (that is what `npm run dev` relies on).

## Scripts

`npm run dev|start|test|smoke|seed|seed:reference|create-admin` (see root README).
