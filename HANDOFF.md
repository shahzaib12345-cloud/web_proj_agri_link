# HANDOFF — AgriLink frontend clean-up (give this file to the next AI model)

You are continuing a two-phase task. Phase 1 (audit) is DONE and approved. Phase 2 (implementation) is in progress.
Update the STATUS checklist below as you finish things. Never mark an item done unless you ran build/lint to verify it.

## Project

AgriLink: Pakistani farmers sell produce directly to buyers and check mandi prices. Roles: farmer, buyer, admin.
Final stack is MERN. THIS repo is the React frontend only (Vite 8 + React 19 + TypeScript + Tailwind 4). The Express API
is built separately. English (LTR) + Urdu (RTL). Phone + password auth only (no email).
Out of scope (never add): payments, delivery/logistics, native mobile, SMS/USSD, AI/LLM, crop-disease detection, email, social login.

## Rules from the owner (highest priority first)

1. Final React-only check: no non-React frontend code, no server code, function components + hooks only, Tailwind only.
2. Do not change visual design/colors/spacing except to fix accessibility or RTL.
3. Don't invent backend behaviour. Where API is missing use the mock layer and mark `// TODO(api)`.
4. Keep the project building after every step (`npm run build`, `npm run lint`).
5. Never print real secrets. No secret exists in this project; none may be added to client code.
6. Final deliverables: cleaned zip, CHANGELOG.md, SECURITY_NOTES.md, RAW outputs of `npm audit`, `npm run lint`, `npm run build`
   (not summarised), and a closing report <300 words in exactly this format: SUMMARY / COMPLETED / REMAINING (frontend, backend, manual) /
   KNOWN RISKS, with ✅ done and ⬜ not done (only ✅ if verified by running).

## Decisions taken (owner did not answer the questions, defaults were applied)

- Keep read-aloud (Web Speech API) as `hooks/useSpeech`.
- Keep current fonts (Outfit, Plus Jakarta Sans, Noto Nastaliq Urdu, Noto Sans Arabic). Owner's spec said Manrope + Noto Naskh Arabic -> open question.
- Add `react-router-dom` for routes + role guards (guards are UX only; Express must enforce roles).
- Phone numbers are NOT shown on public listings. Call buttons only appear on offers that are accepted/completed.
- Only the farmer can mark an offer completed.
- Region = Punjab (Multan/Okara/Lahore/Faisalabad/Sahiwal/Sargodha), ~10 crops. Sindh wording removed.
- Mock data lives only in `src/mocks`, switched by `VITE_USE_MOCKS=true`. Seeded demo accounts need typed phone+password (no one-click role switch).
- Token design: access token kept in memory only (`src/api/tokenStore.ts` is the single place to change storage). Real API should set an
  httpOnly refresh cookie and expose POST /auth/refresh. Mock mode keeps its fake session in sessionStorage inside `src/mocks` only.

## Target structure

```
src/
  api/        client.ts (fetch + auth header + 401->refresh->logout), tokenStore.ts, config.ts, one file per resource
  components/ shared UI (Modal, SafeImage, Skeleton, EmptyState, ErrorBoundary, Toast, Header, BottomNav)
  context/    AuthContext, DataContext, ToastContext
  features/   auth, farmer, buyer, market, weather, advice, admin
  hooks/      useSpeech, useTab (route<->tab helper), ...
  i18n/       en.json, ur.json, I18nContext.tsx (tiny own i18n, no library)
  routes/     AppRoutes.tsx, guards.tsx
  utils/      format.ts (Rs/units/dates), validators.ts (+92 phone etc.)
  mocks/      server.ts (mini REST router implementing the same endpoints), seed data
```

## STATUS

- [x] Step 1 deps/config/tooling/images
- [x] Step 2 restructure
- [x] Step 3 api layer, mock server, contexts, routes, App, all feature components compile (`tsc` clean)
- [x] Step 4 i18n extraction (422 keys en/ur), logical RTL classes, a11y (Modal, labels, 48px targets), skeleton/empty/error states, validators
- [x] Step 5 `npm run lint` and `npm run build` pass, `npm audit` 0 vulnerabilities, README/CHANGELOG/SECURITY_NOTES written
- [ ] Not verified: visual/RTL check in a real browser, screen-reader pass, Urdu copy review by a native speaker, real-API integration

## Known leftovers / ideas not done

- Fonts: spec says Manrope + Noto Naskh Arabic; app uses Outfit, Plus Jakarta Sans, Noto Nastaliq Urdu, Noto Sans Arabic. Owner to decide.
- Photo upload (farmers choose bundled preset images; `TODO(api)`).
- Admin CRUD gaps: crop categories, price create/delete, article edit/delete, farmer listing edit.
- Bilingual API fields: articles and weather advisories are Urdu-only seed data.
- `ProduceUnit` values are bilingual display strings; should become language-neutral codes (`maund`, `bori`, `crate`, `kg`) with i18n labels.
- Cotton is categorised as Cereals & Grains; grain photo reused for wheat/cotton/rice.
- Pagination and server-side filters; `DataContext` could be split per feature.
- Wording to review: "direct payment received" / "zero middleman deductions" (payments are out of scope), "official" mandi rates (reworded to admin-entered).
- Footer helpline was removed (unknown if real). Registered crops list in the auth form is a fixed bilingual list.
- Prettier applied to the whole tree.
