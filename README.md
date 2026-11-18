# ShareSafe Practice

> Digital-safety lessons for students on shared library PCs and old phones: no account, works offline, accessible, private by default, in English and Spanish, and teachers can load any pack.

**AccessED Hacks entry** · Solo entrant: Tejas Chaudhari · Build window **Oct 17 – Nov 20, 2026** · Pre-existing work: **none** (everything in this repo was created during the build window).

Demo: [DEMO_URL] · Video: [VIDEO_URL] · Repo: [REPO_URL]

---

## 60-second judge tour

Open [DEMO_URL] (or `npm run build && npm run preview`, then http://localhost:4173). No account is needed.

1. **Home (10s).** The page is titled Digital Survival Curriculum. Permission to Learn and Spot the Scam are the core lessons. Everyday Fractions is labeled as a bilingual teacher-pack demo. The footer storage badge should say **0 bytes** of progress on the device.
2. **Pre-check (10s).** Start Permission to Learn. Miss both 2-item baseline questions (or get them right — either is fine).
3. **Lesson + transfer (20s).** Read the mock 403, continue, set access on the class roster (hints are available), then take the **isomorphic** 2-item post-check (same ideas, new details). The **Before/After Mastery** card shows the delta and a completion code. The card itself says this is immediate transfer, not long-term retention.
4. **Leave no trace (10s).** Note the storage badge: 0 persistent bytes; the tab may hold a few hundred bytes until it closes; the offline app-shell cache stores no progress. Press **Wipe session**, or **Escape twice**, and confirm. Persistent storage stays at 0.
5. **Teacher loop (10s).** Open **Teacher pack builder**. Paste the completion code into **Teacher Verify** — you should see the pack name and pre/post scores, plus an honest note that the checksum catches typos but is not forgery-proof. Optionally toggle Spanish, or print a QR handout for a tiny custom pack.

---

## Honest Testing Matrix

Recorded **Nov 18, 2026**, America/New_York, against the production build in headless Google Chrome unless noted. Automated tools cannot certify WCAG conformance, and **no conformance claim is made**.

### Verified Automated

| Check | Tool / version | Result |
|---|---|---|
| Unit tests | Vitest 5.1.0 | **32 / 32** pass |
| End-to-end tests | Playwright 1.65.0 | **17 / 17** pass (plus 3 screenshot-regen tests) |
| axe-core | axe-core 4.14.0 via @axe-core/playwright 4.14.0, tags WCAG 2.0/2.1/2.2 A & AA + best-practice | **0 violations in 25 scans** (9 views × default and high-contrast + extra-large + plain language, plus Spanish home, builder, mastery card, Teacher Verify, Spanish fractions pre-check, and emulated 320px + forced-colors home and resume-code views). `docs/reports/axe-results.json` |
| Lighthouse | 13.6.0, mobile and desktop | Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**. Mobile FCP 1.1 s, LCP 1.4 s, TBT 0 ms, CLS 0. Desktop FCP 0.3 s. Transfer size **33 KiB**. `docs/reports/lighthouse-*.report.html` |
| First load (gzip) | Vite 6.4.6 production build | `index.html` 1.05 KB + `style.css` 2.83 KB + `index.js` 27.22 KB ≈ **31.1 KB**. No UI frameworks, web fonts, analytics, or LLM calls. Packs, builder, fractions and QR are lazy chunks. |
| Throttled load | Playwright, emulated 2G / Slow 3G | Usable in **2.2 s** on Regular 2G (250 kbps, 300 ms RTT) and **1.75 s** on Slow 3G (400 kbps, 400 ms RTT). `docs/reports/throttle-results.json` |

### Verified Manual

These rows were run in **emulated** automation only, except where marked TODO. They are **not** a substitute for real assistive-technology or device testing.

| Check | How it was run | Result |
|---|---|---|
| Keyboard-only journey | Playwright keyboard events (Tab, arrows, Enter, Escape) | Pass. Skip link is the first Tab stop; pre-check, 403 intro, access grid, resume code, typo rejection, restore, and double-Escape wipe confirmation all work. |
| 320 px reflow | Playwright viewport **320×640** (emulated) | Pass after a fix: the native file-input widget overflowed by ~25 px; it is now visually hidden and activated from its label. Resume codes wrap. |
| Forced colors | Playwright `forcedColors: 'active'` (emulated) | Pass. axe 0 on home and resume-code; focus rings and borders use system Highlight / ButtonText. |
| Prefers-reduced-motion | Playwright `reducedMotion: 'reduce'` (emulated) | Pass. Animations and transitions are disabled in CSS. |
| 200% zoom / 320 px | Emulated as a 320 CSS-pixel viewport (the WCAG 1.4.10 reflow target). A separate desktop-browser 200% zoom pass was **not** run by hand. | Emulated pass only. |
| VoiceOver (macOS / iOS) | — | **TODO — not run** |
| NVDA (Windows) | — | **TODO — not run** |
| Safari desktop | — | **TODO — not run** |
| Safari / iOS | — | **TODO — not run** |
| Physical phone, airplane mode, offline resume | — | **TODO — not run** (wait until after a deploy; localhost QR codes are not scannable from a phone) |
| Printed QR handout, native camera scan | — | **TODO — not run** (same reason) |
| Native-speaker review of the Spanish | — | **TODO — not run**. Neutral school Spanish is in the app; it has not been reviewed by a fluent speaker. |

The step-by-step list for the remaining manual work is in [`docs/tejas-manual-test-checklist.md`](docs/tejas-manual-test-checklist.md).

### Explicitly Untested

- **No K-12 students were tested.** There is no student data in the app or in this repo.
- Pre/post scores measure **immediate scenario transfer** (same concept, new surface details in the same session). They are not a validated assessment and do not show longitudinal classroom retention. The mastery card says this in the UI.
- **JAWS** and **refreshable braille displays** were not evaluated.
- Real low-end hardware, TalkBack, and Safari/iOS were not evaluated (see TODO rows above).

---

## AI Attribution

Most of the code, tests, lesson text, Spanish translation and documentation were drafted by an AI assistant (Grok Bot) at Tejas Chaudhari's direction. Tejas chose the problem, users, direction and constraints, and reviews the work. Commits by the assistant are authored as "Grok Bot (AI assistant for Tejas Chaudhari)". This disclosure also appears in the Devpost write-up.

---

## Problem

In Pew Research Center's 2018 survey of U.S. teens ages 13–17, **17% said they are often or sometimes unable to complete homework because they lack reliable access to a computer or internet connection**. 12% said they at least sometimes use public Wi-Fi for schoolwork because they have no home internet, and 35% said they often or sometimes do homework on a cellphone, rising to 45% among teens in households earning under $30,000 a year. ([Pew Research Center, Anderson & Perrin, Oct 26, 2018](https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/))

Those students work on shared library PCs, public Wi-Fi and low-end phones — the same places where login friction is high and digital-safety risks are highest.

## Intended users

- **Primary:** middle-school and early high-school students who mostly use shared or public computers or low-end phones with limited data.
- **Also:** students who use a keyboard only, a screen reader, larger text or high contrast, plain language, read-aloud, or Spanish.
- **Secondary:** teachers, librarians and after-school staff who want to hand out a lesson with a printed QR code and no logins to manage.

## Solution

ShareSafe Practice is a tiny offline-first PWA that plays **content packs**.

- **Digital Survival Curriculum (core):** **Permission to Learn** (a 403 explanation and a least-privilege file-access exercise) and **Spot the Scam** (fictional student messages, `.example` domains, clearly badged as fiction).
- **Everyday Fractions: Bilingual Teacher Pack Demo:** shows that a teacher can hand out offline homework with a printed QR code and no student accounts. Generated practice is fully bilingual.
- **Every pack:** a **2-item baseline pre-check**, interactive practice, and a **2-item isomorphic post-check** (same concept, new surface details), then a **Before/After Mastery** card with the delta and a completion code.
- **Teacher pack builder** (lazy, no backend): multiple-choice questions, optional Spanish fields, a pre/practice/post tag, a live byte counter, JSON export/import, a printable QR handout (`#p=` in the hash, with a size warning), and **Teacher Verify**, which decodes pack id and pre/post scores from the checksummed code, with zero PII. The UI says the checksum catches typos but is not forgery-proof.
- **No account. Works offline after one load. Leave-no-trace by default.** A live storage badge measures localStorage, sessionStorage, IndexedDB and caches. In leave-no-trace mode it reports **0 bytes** of progress in persistent stores; the open tab may hold a few hundred bytes until it closes; the service-worker **app-shell cache is for offline use and stores no progress**. **Wipe session** and a documented **double-Escape** shortcut open an announced confirmation before anything is deleted.
- **Resume / completion code + QR.** An 18-character code restores progress **and the pack** on any device.
- **Accessible and bilingual.** Keyboard-only, focus moved to the new step heading on each view, `aria-live="polite"` feedback, text size, high contrast, plain language, read-aloud, and a language switcher that sets `document.documentElement.lang`. Mixed-language content (for example “403 Forbidden” and `.example` addresses) is marked with `lang`.

---

## Setup

```bash
npm install
npm run dev
npm run build
npm run preview          # http://localhost:4173
npm test                 # unit tests
npm run build && npx playwright test
SCREENSHOTS=1 npx playwright test screenshots
```

**Bundle (gzip):** first load = `index.html` 1.05 KB + `style.css` 2.83 KB + `index.js` 27.22 KB ≈ **31.1 KB**. Lighthouse reports 33 KiB transferred including the manifest and icon. Lazy precached chunks: Permission 11.8 KB, Spot the Scam 12.3 KB, builder 5.2 KB, fractions 4.0 + 1.0 KB, QR 7.9 KB.

## Limitations

- Teacher-built packs are multiple choice only (no access grids or message cards in the builder) ; Spanish in the builder is optional and only included when the author fills it in.
- Resume / completion codes catch typos but **are not forgery-proof**. A code for a custom pack restores only on a device where that pack is loaded.
- Pre/post checks are 2 items, indicative of immediate transfer only.
- QR handouts work only for small packs. A pack in the URL hash is readable by anyone with the link and must never contain student data.
- Leave-no-trace cannot erase browser history or OS-level logs. A QR or resume link works offline only on a device that has loaded the app (and that pack) once.
- Spanish has not been reviewed by a native speaker. Real screen readers, Safari/iOS, and physical devices are still TODO.

## Credits, AI disclosure, and pre-existing work

- **Fractions content:** topics follow *Prealgebra 2e*, Chapter 4, by Lynn Marecek, MaryAnne Anthony-Smith and Andrea Honeycutt Mathis, © OpenStax / Rice University, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), <https://openstax.org/details/books/prealgebra-2e>. No OpenStax text was copied; problems are generated.
- **Permission to Learn and Spot the Scam:** original. All names, files, messages and domains are fictional.
- **Statistic:** Pew Research Center, Anderson & Perrin, Oct 26, 2018, <https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/>.
- **Libraries:** qrcode-generator (MIT). Dev-only: Vite, TypeScript, Vitest, Playwright, @axe-core/playwright (MPL-2.0), Lighthouse, serve.
- **AI disclosure:** see [AI Attribution](#ai-attribution) above.
- **Pre-existing work:** none. **Team:** Tejas Chaudhari (solo).
