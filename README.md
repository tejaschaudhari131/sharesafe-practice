# ShareSafe Practice

**Private, offline-first fractions practice for students on old phones and shared or library computers.**
No accounts, no names, no tracking. After the first load it works with no internet at all, and a short **resume code** (or QR) lets a student carry their progress from a library PC to their own phone without signing up for anything.

> Built for **AccessED Hacks**. Build window: **Oct 17 – Nov 20, 2026** (submission deadline Nov 20, 2026, 5 PM ET).

## The problem

Many students do homework on devices they don't control: a library or school computer, a sibling's phone, or an old Android with patchy data. Most practice apps expect the opposite: a personal device, a reliable connection, an account (usually with an email address), and permission to store data. That leaves out students who:

- **share devices**, and so can't stay logged in or don't want the next person to see their work;
- have **little or expensive data**, so heavy apps and videos don't load;
- **can't or won't create accounts** (under-13 students, privacy-conscious families, school device restrictions);
- **need accessibility support**: keyboard-only use, screen readers, larger text, higher contrast, simpler language, or having text read aloud.

## Who it's for

- Middle-school and adult-education learners practising fractions (equivalent fractions, add/subtract with unlike denominators, comparing).
- Librarians, tutors and after-school programs that need something they can put on shared machines safely.

## Features (MVP)

| Area | What it does |
|---|---|
| **Learning loop** | 6-question **pre-check** → practice with **3 progressive hints**, a **fraction-bar visual model**, and **worked steps** → 6-question **post-check** → **before/after** results by skill. |
| **Content** | Three skills: equivalent fractions (missing numerator/denominator), add & subtract with unlike denominators, compare (<, >, =). Problems are **procedurally generated** from a seed, so there's an unlimited supply and they're deterministic, which lets the resume code restore the *exact* next problem. Equivalent unsimplified answers are accepted, with a note showing the simplest form. |
| **Offline** | Service worker precaches the whole app (9 files) on first visit. Cache-first afterwards, with a navigation fallback for deep links. An offline banner reassures the user that everything still works. |
| **Low bandwidth** | No frameworks, web fonts, images or third-party requests. **~15 KB gzipped** first load (HTML + CSS + JS), plus a lazily loaded 8 KB QR chunk (also precached). |
| **Accessibility** | Semantic HTML (landmarks, headings, fieldsets/legends, labelled inputs, table with caption and scopes), skip link, full keyboard operation, visible 3 px focus ring, focus moved to each new view's heading, live regions for feedback, 44 px targets. Toggles for **text size (100/125/150%)**, **high contrast**, and **plain language** (every instruction, hint and step has a simpler version). **Read aloud** via the Web Speech API for problems, hints, steps and the resume code (spelled out). Fractions are announced as "3 over 4" to screen readers. Respects `prefers-reduced-motion` (there are no animations to begin with). |
| **Resume code** | 18-character Crockford base32 code (`XXXXXX-XXXXXX-XXXXXX`) plus a QR code that links to `#r=CODE`. Entering it on another device restores progress. Accepts lowercase and spaces and treats O/0 and I/L/1 as the same. The code is removed from the address bar after it's read. |
| **Leave no trace** | **On by default**: progress lives only in `sessionStorage` (gone when the tab closes). Students can opt in to "Save on this device". **End session** wipes localStorage, sessionStorage, and any IndexedDB databases, and can optionally remove the offline copy (Cache Storage and the service worker). It then confirms what it removed. |
| **Privacy and security** | No network requests after load, no analytics, no cookies. A strict Content-Security-Policy is set in the build (`default-src 'self'`, no inline script, `form-action 'none'`). No personal data is ever collected. |

### About the resume code's integrity check (honest version)

The code packs 78 bits of progress (version, a random 16-bit problem seed, stage, pre/post-check answers, per-skill correct/attempt counters, hints used) into 16 characters. It adds a **CRC-10 checksum** (2 characters) on top.

- **What it does:** it catches mistakes. CRC-10 detects **every** error burst of 10 bits or fewer, so it is guaranteed to catch **any single wrong character** and **any swap of two neighbouring characters**. The unit tests check this exhaustively on hundreds of codes. Random garbage is accepted only about 1 time in 1,024, and range checks reject "impossible" values on top of that.
- **What it does *not* do:** it does **not** prevent deliberate forgery. Everything runs in the browser, so the algorithm (and any "secret" key we might embed) is visible to anyone who reads the source. An HMAC with a client-side key would only *look* more secure. That's acceptable here because the code drives self-practice, not grades or credentials. Making codes unforgeable would need a server or teacher-held signing key (see *Limitations*).
- **What's inside:** no name, no device ID, no timestamps. It contains only the fields listed above.

## Setup

Requirements: Node 20+ (tested with Node 24).

```bash
npm install
npm run dev        # local dev server (service worker disabled in dev)
npm run build      # type-check, build to dist/, generate dist/sw.js precache list
npm run preview    # serve dist/ at http://localhost:4173 (SPA mode)
```

Tests:

```bash
npm test                         # unit tests (Vitest)
npx playwright test              # e2e + axe + throttling (uses the system Chrome; builds must be fresh: run npm run build first)
SCREENSHOTS=1 npx playwright test screenshots   # regenerate docs/screenshots
```

Stack: Vite 6 + TypeScript (vanilla, no UI framework), `qrcode-generator`, a hand-written service worker generated by `scripts/gen-sw.mjs`.

## Testing evidence

All results below were recorded on Nov 11, 2026 against the production build (`npm run build`, served with `serve -s dist`), using headless Google Chrome.

**Unit tests (Vitest): 21/21 passing** (`tests/unit/`)
- Problem generation: deterministic per seed; property sweep of **9,000 generated problems** (3,000 per skill) checking every answer is mathematically correct, subtraction never goes negative, add/sub always uses unlike denominators, answers are in simplest form, and compare covers <, >, and =. The pre/post checks have 2 questions per skill and use different problems.
- Grading: exact, equivalent-unsimplified (with note), wrong, zero denominator, non-numeric.
- Resume codes: 5,000 random round-trips. **Exhaustive** single-character substitution detection (200 codes × 18 positions × 31 alternatives) and adjacent-transposition detection (500 codes). Input normalisation, counter saturation, impossible-value rejection, and no-PII field whitelist.

**End-to-end (Playwright): 10/10 passing** (`tests/e2e/`), plus 3 screenshot jobs
- **Keyboard-only flow:** skip link is the first Tab stop → pre-check (4/6) using only Tab/Enter/Space/arrow keys → practice: wrong answer, two hints, correct answer, focus moves to "Next problem" → switch skill → get resume code → **restore in a fresh browser context** (typo rejected with a helpful message, lowercase + spaces accepted) → restored progress is identical.
- **QR deep link** `#r=CODE` pre-fills the restore form and strips the code from the URL.
- **Full journey** to before/after results (2/6 → 5/6, "+3").
- **Offline:** after the first load the service worker is ready → browser set offline → reload works, the offline banner shows, you can start a quiz, a deep link works, and the lazily loaded QR chunk works.
- **Leave no trace:** default writes nothing to localStorage. Opting in writes to localStorage. End session (with "remove offline copy") results in localStorage 0, sessionStorage 0, Cache Storage 0, service workers 0, IndexedDB databases 0.
- **Toggles:** text size, high contrast (`aria-pressed`), plain language (focus is preserved on re-render).
- **Throttled cold load** (CDP network emulation; `docs/reports/throttle-results.json`): usable in **~1.2 s on "Regular 2G" (250 kbps, 300 ms RTT)** and **~1.3 s on Slow 3G**. The offline copy is ready in about 2 s. (Service-worker fetches may not be fully covered by page-level throttling.)

**axe-core 4.x (WCAG 2.0/2.1/2.2 A & AA + best practices): 0 violations** on all 16 scans: 8 views (home, pre-check, practice + hint, worked steps, compare, resume code, end session, about) × 2 modes (default, and high-contrast + extra-large text + plain language). See `docs/reports/axe-results.json`.

**Lighthouse 13.6 (home page):** see `docs/reports/lighthouse-*.report.html`

| | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| Mobile (simulated slow 4G, 4× CPU) | 100 | 100 | 100 | 100 | 0.8 s | 1.2 s | 0 ms | 0 | 18 KiB |
| Desktop | 100 | 100 | 100 | 100 | 0.2 s | 0.3 s | 0 ms | 0.004 | 18 KiB |

**Bundle** (`dist/`, 73 KB total uncompressed, including icons):
`index.js` 34.6 KB (12.5 KB gz) · `style.css` 5.2 KB (1.8 KB gz) · `index.html` 2.1 KB (0.9 KB gz) · `qr.js` 21.6 KB (7.8 KB gz, lazy) · `sw.js` 1.1 KB.

Automated tools can't certify WCAG conformance. A manual screen-reader pass (NVDA/VoiceOver/TalkBack) is still on the to-do list (see below).

### Screenshots

`docs/screenshots/`: `desktop-*` (1280×800) and `mobile-*` (360×740 @2x) for home, pre-check, practice with hints, worked steps, correct feedback, resume code + QR, end-session confirmation, session ended, high contrast + extra-large + plain language, and offline. Also included: `desktop-11-results-before-after.png` and `qr-only.png`. The QR was verified to decode with OpenCV.

## Limitations and known gaps

- **One topic only** (fractions: three skills). Mixed numbers, multiplication/division and word problems aren't covered yet.
- **Resume codes are tamper-*evident* against typos, not forgery-proof** (by design; see above). Unforgeable codes for teacher verification would need a server-side or teacher-held signing key. That would be a deliberate future feature, not a client-side illusion.
- **Read-aloud depends on the device's speech voices.** Some browsers or old Android WebViews have no voices installed, and in that case the button is hidden. Wording like "3 over 4" is used on purpose.
- **"Leave no trace" can't erase what the browser itself keeps**: history, the HTTP disk cache before the service worker takes over, or OS-level logs. The end screen says so and recommends a private window on shared computers.
- **Pre/post-check is a 6-item quick check**, not a validated assessment, and the before/after numbers are indicative only.
- **Not yet tested by hand** with screen readers, real low-end Android hardware, or Safari/iOS (iOS < 15.4 lacks some APIs; the app avoids `<dialog>` for this reason). Automated checks only so far.
- Practice progress counters saturate at 31 correct / 63 attempts per skill in the code.
- English only.

## Deploying (once approved; not done yet)

It's a fully static site with no environment variables or backend.

1. Create a GitHub repo and push this local repo (it has not been pushed anywhere).
2. In Vercel: **New Project → import the repo**. Framework preset: *Other* (or Vite). `vercel.json` already sets `buildCommand: npm run build` and `outputDirectory: dist`, long-lived caching for `/assets/*`, `no-cache` for `sw.js`, and security headers.
   Or use the CLI: `npx vercel` (preview) then `npx vercel --prod`.
3. After deploy: open the URL once, go offline in DevTools, and reload to confirm offline mode. Re-run Lighthouse against the live URL, and check that the QR codes point at the production origin (they use `location.origin`, so they will).

## Credits

- **Content:** topics and solution strategies follow *Prealgebra 2e* (Chapter 4, "Fractions": *Visualize Fractions*; *Add and Subtract Fractions with Different Denominators*) by Lynn Marecek, MaryAnne Anthony-Smith and Andrea Honeycutt Mathis, © OpenStax / Rice University, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Access for free at <https://openstax.org/details/books/prealgebra-2e>. **Changes:** no OpenStax text, figures or exercises were copied. All problems, hints and worked steps are original and generated by code.
- **Libraries:** [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT, Kazuhiko Arase; "QR Code" is a registered trademark of DENSO WAVE). Dev only: Vite, TypeScript, Vitest, Playwright, @axe-core/playwright (axe-core, MPL-2.0), Lighthouse, serve.
- **AI assistance:** most of the code, tests and docs in this MVP were drafted by an AI assistant (Grok Bot) working for Tejas Chaudhari, who directed the product, scope and design decisions and reviews the work. Commits authored by the assistant are labelled as such in git history.
- **Team:** Tejas Chaudhari.
