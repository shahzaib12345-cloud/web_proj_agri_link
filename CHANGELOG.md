# Changelog

## Cleanup release (Phase 2)

### Removed

- AI Studio / Gemini leftovers: `@google/genai`, `express`, `dotenv`, `motion`, `tsx`, `esbuild`, `autoprefixer` dependencies,
  `metadata.json`, the AI Studio block in `vite.config.ts`, social/twitter meta, "MERN Stack Client" footer text.
- Hardcoded demo auth: one-click role switcher, prefilled credentials, fake token, hardcoded tel helpline.
- Old `AppContext`, `services/mockApi.ts`, monolithic `translations.ts`.
- Out-of-scope wording: logistics in default offer message, Sindh wording, "direct payment" claims where reworded.
- ~3.9 MB of unoptimised images in `src/assets` (replaced by ~350 KB WebP in `public/images`, which also fixes
  `/src/assets/...` paths that break in production).

### Security

- Access token in memory only; no token or role in localStorage. Generic login error (no account enumeration).
- Registration cannot request the admin role. Passwords validated (8-64, letters + digits). Passwords cleared when the dialog closes.
- Phone numbers are no longer shown on public listings; they appear only on accepted/completed offers (server-supplied).
- Client no longer sends farmer id/name/phone/location or computed totals; the server derives them.
- Input bounds on every numeric/date/text field; image URLs limited to `/images/` or `https://`.
- No `dangerouslySetInnerHTML` (ESLint rule enforces it). Weather API key must stay server-side (proxied `GET /weather`).
- Mock server and seed (demo passwords) are excluded from production builds. `npm audit`: 0 vulnerabilities.

### Structure

- `src/{api,components,context,features,hooks,i18n,mocks,routes,types,utils}`; react-router with role guards.
- All data access goes through `src/api`; `VITE_USE_MOCKS` switches mock/real.

### i18n / RTL / a11y

- All user-facing strings in `en.json` / `ur.json` (422 keys each). Language toggle sets `<html lang dir>` and persists.
- Logical (start/end) Tailwind classes, 48px touch targets, labelled inputs, aria-labels on icon buttons,
  shared accessible `Modal` (focus trap, Escape, focus restore), skip link, keyboard-operable cards.

### States and tooling

- Error boundary, skeletons, empty states, load-error banner with retry.
- ESLint (flat config) + Prettier; `npm run lint` = eslint + tsc.
- `.env.example`, `.gitignore`, new README.
