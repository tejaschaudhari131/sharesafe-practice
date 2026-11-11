# ShareSafe Practice

> Fractions practice for students on shared library PCs and old phones: no account, works offline, ~18 KB first load, accessible, and a resume code carries progress anywhere.

**AccessED Hacks entry** · Solo entrant: Tejas Chaudhari (graduate student, MSISPM, Heinz College, Carnegie Mellon University) · Build window **Oct 17 – Nov 20, 2026** · Pre-existing work: **none** (everything in this repo was created during the build window).

Demo: [DEMO_URL] · Video: [VIDEO_URL] · Repo: [REPO_URL]

---

## Contents
1. [Problem](#problem)
2. [Intended users](#intended-users)
3. [Solution](#solution)
4. [Judging criteria map](#judging-criteria-map)
   - [Barrier Removed (with before/after)](#1-barrier-removed)
   - [Learning Value](#2-learning-value)
   - [Inclusive Experience (with testing evidence)](#3-inclusive-experience)
   - [Working Prototype & Explanation](#4-working-prototype--explanation)
5. [Tools](#tools)
6. [Setup](#setup)
7. [Challenges](#challenges)
8. [What I learned](#what-i-learned)
9. [Limitations](#limitations)
10. [Deploying](#deploying-not-done-yet)
11. [Credits, AI disclosure, pre-existing work](#credits-ai-disclosure-and-pre-existing-work)

---

## Problem

The "homework gap" is real and measurable. In Pew Research Center's 2018 survey of 743 U.S. teens ages 13–17, **17% said they are often or sometimes unable to complete homework because they lack reliable access to a computer or internet connection**. 12% said they at least sometimes use public Wi-Fi to do schoolwork because they have no home internet, and 35% said they often or sometimes have to do homework on a cellphone. That last figure was 45% among teens in households earning under $30,000 a year. ([Pew Research Center, Anderson & Perrin, Oct 26, 2018](https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/))

Students in that situation do their practice on devices and networks they don't control: a library or school computer with a time limit, public Wi-Fi, a shared family phone, an old Android with little data. Many practice tools assume the opposite:

- **an account** (usually an email address), which under-13s, privacy-conscious families and locked-down school devices often can't provide;
- **a personal device**, so progress and logins stay on the machine. On a shared PC that means the next person can see your work, or you lose it when you log out;
- **a fast, steady connection** for heavy pages, video and cloud saves;
- **one way of reading and interacting**, with mouse-first interfaces, small text and dense instructions.

## Intended users

- **Primary:** middle-school and adult-education learners practising fractions who mostly use shared/public computers or low-end phones with limited data.
- **Also:** learners who use a keyboard only, a screen reader, larger text or high contrast, or who benefit from plain-language instructions or hearing text read aloud.
- **Secondary:** librarians, tutors and after-school programs who need something safe to put on shared machines (no logins to manage, nothing left behind).

## Solution

ShareSafe Practice is a tiny, offline-first web app (PWA) for one well-defined topic, fractions (equivalent fractions, adding/subtracting with unlike denominators, comparing). It is designed so that **nothing about the student's situation blocks them**:

- **No account, no personal data.** Open the page and start.
- **Works offline after one load.** The whole app (about 15 KB gzipped on first load) is cached by a service worker.
- **Leave no trace by default.** Progress stays only in the open tab. **End session** wipes everything the app stored, and can also remove the offline copy.
- **Resume code + QR.** An 18-character code (or a QR scan) moves progress from a library PC to a phone, or from one day to the next, without a server or account.
- **A learning loop that shows growth.** A 6-question pre-check, then practice with progressive hints, visual fraction bars and worked steps, then a 6-question post-check with before/after results.
- **Accessible by design.** Keyboard-only, screen-reader friendly, text size, high contrast, plain language, read-aloud, and reduced-motion friendly.

---

## Judging criteria map

### 1. Barrier Removed

**Barriers addressed:** needing an account, needing a personal device, needing a reliable connection, and privacy risk on shared machines.

#### Concrete before-and-after example

*Scenario:* Maya, a 7th grader, has no home internet. She has a 30-minute session on a public library computer after school and an old Android phone with almost no data. Fractions homework is due Friday.

| | **Before** (typical account-based, cloud-saved practice site) | **After** (ShareSafe Practice) |
|---|---|---|
| Getting started | Has to create an account with an email (or a parent's) before the first problem. | Opens the page and presses **Start the pre-check**. No sign-up, no name. |
| On the library PC | Progress is tied to a login on a shared machine. She must remember to log out, and the browser may still keep her session for the next person. | Progress lives only in that tab by default. She presses **End session** and confirms. The app wipes its local/session storage and IndexedDB, and can optionally remove its offline copy (tested to 0 items left). |
| Taking it home | Needs the internet at home to load the site and sync progress. | Before leaving, she opens **Resume code** and scans the QR with her phone while on library Wi-Fi. The phone opens the app, restores her progress and caches the app. |
| At home, offline | Can't load the site, so can't practise. | The app opens offline on the phone. She continues from the **exact next problem**, with hints and worked steps. |
| Data cost | Heavy pages with scripts, fonts and images. | **18 KiB** transferred for the first load (Lighthouse). In a throttled test it is usable in **~1.2 s** on emulated "Regular 2G" (250 kbps, 300 ms RTT). |
| Result | Her practice depends on whether she has an account, a device and a connection. | She took the pre-check (2/6), practised, and took the post-check (5/6). The results screen shows **"Before 2/6 → After 5/6 (+3)"**. This flow is reproduced by the e2e test *"full journey reaches before/after results"*. The scores in the scenario are illustrative and match that test. |

### 2. Learning Value

- **Aligned to an open textbook.** Topics and solution strategies follow OpenStax *Prealgebra 2e*, Chapter 4 "Fractions" (*Visualize Fractions*; *Add and Subtract Fractions with Different Denominators*), CC BY 4.0. Each worked solution uses the same steps: find the LCD, convert to equivalent fractions, add/subtract the numerators, simplify. All problems, hints and steps are original and generated by code.
- **Scaffolding that fades.** Each problem has **three progressive hints**: first noticing the key idea, then the intermediate value, then the last step. They are paired with **fraction-bar visual models** (with text alternatives), and a full **worked solution** is available on request. Viewing the solution counts as an attempt, not a correct answer, so the stats stay honest.
- **Feedback that teaches.** Equivalent but unsimplified answers are accepted with a note showing the simplest form ("Correct! In simplest form that's 3/4."). Invalid input gets a specific, plain message ("The bottom number cannot be 0.").
- **Unlimited, correct practice.** Problems are procedurally generated from a seed. A property test checks **9,000 generated problems** (3,000 per skill) for mathematically correct answers, no negative subtraction results, always-unlike denominators in add/subtract, simplest-form answers, and all three outcomes (<, >, =) appearing in compare.
- **Measurable growth.** The pre-check and post-check each have 2 questions per skill, with different problems in each. The results screen shows before/after scores overall and per skill, plus practice counts and hints used. *Caveat:* a 6-item quick check is indicative, not a validated assessment.
- **Mastery guidance.** The app suggests the post-check once the student has 3 correct answers in every skill.

### 3. Inclusive Experience

**Design features**
- Semantic HTML: landmarks, one `h1` per view, fieldsets/legends for answer groups, labelled inputs, a results table with caption and header scopes. A skip link is the first Tab stop. When the view changes, focus moves to the new heading, and answer feedback is announced through live regions.
- **Full keyboard operation** (Tab/Shift-Tab, Enter, Space, arrow keys for radio groups), a **visible 3 px focus ring**, and touch targets of at least 44 px.
- Toggles: **Text size** (100/125/150%), **High contrast** (black/yellow/white), **Plain language** (every instruction, hint and step has a simpler version). The toggles use `aria-pressed`, and focus is kept when the view re-renders.
- **Read aloud** (Web Speech API) for problems, hints, worked steps, and the resume code spelled out character by character. Screen readers hear fractions as "3 over 4", not "3 slash 4". The visual stacked fractions are hidden from assistive tech, and spoken text replaces them.
- Respects `prefers-reduced-motion`. There are no animations at all.
- Low bandwidth: no web fonts, images (besides icons), frameworks, trackers or third-party requests.
- Privacy as inclusion: no data is collected. The app is safe to use on a device you share with others.

**Testing evidence (honest)**

All automated results were recorded on Nov 11, 2026 against the production build, in headless Google Chrome.

- **axe-core (WCAG 2.0/2.1/2.2 A & AA + best practices): 0 violations in 16 scans.** These cover 8 views (home, pre-check, practice + hint, worked steps, compare, resume code, end session, about) in 2 modes each: default, and high-contrast + extra-large text + plain language. File: `docs/reports/axe-results.json`.
- **Lighthouse 13.6, home page:** Accessibility **100**, Performance **100**, Best Practices **100**, SEO **100** on both mobile (simulated slow 4G, 4× CPU slowdown) and desktop. Mobile: FCP 0.8 s, LCP 1.2 s, TBT 0 ms, CLS 0. Files: `docs/reports/lighthouse-*.report.html`.
- **Keyboard-only e2e test:** the whole journey runs using only key presses: pre-check, practice with a wrong answer, hints, a correct answer, switching skill, getting the resume code, then restoring it in a fresh browser.
- **Throttled cold load:** usable in ~1.2 s on emulated 2G and ~1.3 s on Slow 3G (`docs/reports/throttle-results.json`).
- **Found by manual review, not automation:** in high-contrast mode the pressed toggle buttons had yellow text on a yellow background. axe didn't flag it, but reviewing the screenshots caught it, and it is now fixed. This is why manual testing still matters.
- **Not yet done:** testing with real assistive technology (NVDA, VoiceOver, TalkBack), on real low-end Android hardware, and in Safari/iOS. A checklist with blanks for results is in [`docs/manual-test-checklist.md`](docs/manual-test-checklist.md). Automated tools cannot certify WCAG conformance, and **no conformance claim is made**.

### 4. Working Prototype & Explanation

- **It runs:** `npm install && npm run build && npm run preview`, then open http://localhost:4173. Screenshots (desktop 1280×800 and mobile 360×740) are in `docs/screenshots/`, including the offline state.
- **Tests:** 21 unit tests (Vitest) and 10 end-to-end tests (Playwright), all passing.

**Unit tests (`tests/unit/`)**
- Problem generation: deterministic per seed, the 9,000-problem correctness sweep, and pre/post-check composition.
- Grading: exact, equivalent, wrong and invalid input.
- Resume codes: 5,000 random round-trips. Every single-character substitution (200 codes × 18 positions × 31 alternatives) and every adjacent swap (500 codes) is detected. Also covers input normalisation, counter saturation and rejection of impossible values.

**End-to-end tests (`tests/e2e/`)**
- The keyboard-only journey.
- The QR deep link pre-fills the restore form and is removed from the address bar.
- The full journey shows before/after results.
- Offline: reload, start a quiz, open a deep link and the QR screen with the network off.
- Leave-no-trace: default uses session storage only. End session leaves localStorage, sessionStorage, Cache Storage, service workers and IndexedDB all at 0.
- The display toggles.
- Throttled load.
- axe scans.

**How it works**
- **Problem engine** (`src/fractions.ts`): a seeded PRNG (mulberry32) mixed with skill, index and purpose builds each problem. A problem has its question parts, answer, three hints, worked steps, and the fractions for the bar model. Every piece of text has a `std` version and a `plain` version.
- **Resume code** (`src/resume.ts`): 78 bits of progress, padded to 80, plus a 10-bit CRC, written as 18 Crockford base32 characters. The 78 bits are version, 16-bit random seed, stage, pre/post answered counts and correctness bitmasks, per-skill correct/attempt counters, and hints used. CRC-10 (poly 0x233) detects every error burst of 10 bits or fewer, so any single wrong character and any swap of neighbours is caught.
- **Honest security note:** this is an *integrity checksum*, not a signature. It catches typos and corruption. It does **not** stop someone who reads the source from crafting a code. Any key embedded in client-side code (for example an HMAC key) could be read the same way, so pretending otherwise would be misleading. That is acceptable because the code only drives self-practice. Unforgeable, teacher-verifiable codes would need a server or teacher-held key, which is listed as future work.
- **Storage** (`src/storage.ts`): sessionStorage by default, localStorage only if the student opts in. `endSession()` clears both, deletes all IndexedDB databases, and optionally clears Cache Storage and unregisters the service worker.
- **Offline** (`scripts/gen-sw.mjs`): runs after the build and writes `dist/sw.js`, which precaches every built file. It is versioned by a content hash and serves cache-first, with a navigation fallback.
- **UI** (`src/main.ts`): vanilla TypeScript, with no framework, to keep the bundle small. A strict Content-Security-Policy is set in the build (`default-src 'self'`, no inline script, `form-action 'none'`).

---

## Tools

- **Language/build:** TypeScript, Vite 6 (static build), vanilla DOM (no UI framework).
- **Runtime library:** [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT).
- **Browser APIs:** Service Worker + Cache Storage, Web Speech API (`speechSynthesis`), Web Storage, IndexedDB (only to delete leftovers), Clipboard API.
- **Testing:** Vitest, Playwright (with system Google Chrome), @axe-core/playwright (axe-core), Lighthouse 13.6, Chrome DevTools Protocol network throttling, OpenCV (to check the QR decodes).
- **Content source:** OpenStax *Prealgebra 2e* (CC BY 4.0).
- **AI assistance:** Grok Bot (an AI assistant) for code, tests and docs drafts. See the disclosure below.
- **Hosting (planned, not yet deployed):** Vercel static hosting (`vercel.json` included).

## Setup

Requirements: Node 20+ (tested on Node 24) and npm. Google Chrome for the e2e tests.

```bash
npm install
npm run dev          # dev server (service worker disabled in dev)
npm run build        # type-check + build to dist/ + generate dist/sw.js
npm run preview      # serve dist/ at http://localhost:4173

npm test                                      # unit tests
npm run build && npx playwright test          # e2e, axe, throttling (uses system Chrome)
SCREENSHOTS=1 npx playwright test screenshots # regenerate docs/screenshots
```

To try offline mode by hand: run `npm run preview`, load the page once, then in DevTools go to Network and choose Offline, and reload.

Bundle: `index.js` 34.6 KB (12.5 KB gz), `style.css` 5.2 KB (1.8 KB gz), `index.html` 2.1 KB (0.9 KB gz), lazy `qr.js` 21.6 KB (7.8 KB gz, also precached), `sw.js` 1.1 KB. The whole `dist/` is about 73 KB including icons.

## Challenges

- **An offline reload that broke for a non-obvious reason.** The first service worker precached `index.html`, but the static server redirects `/index.html` to `/`. Browsers refuse to use a *redirected* cached response for a page navigation, so reloads failed with `net::ERR_FAILED`. The fix was to cache the app shell under `./` and serve navigations from that. Vercel's clean URLs would have caused the same problem.
- **Being honest about "tamper-proof".** The brief asked for progress codes protected against tampering. With no server, any secret in the page is public, so an HMAC would only *look* secure. I chose a checksum with *provable* typo detection (CRC-10 over 5-bit symbols), explained its limits in the app and here, and tested its guarantees exhaustively.
- **Fitting progress into something a student can copy by hand.** The aim was a code short enough to write on paper that still restores the *exact* next problem. Deterministic seeded generation means the code only needs a seed and counters, not the problems themselves: 78 bits, 18 characters.
- **Accessibility bugs automation missed.** Pressed toggles were unreadable in high-contrast mode, and focusing the heading on first load stole the skip link's place as the first Tab stop. Neither was reported by axe. One was caught by reviewing screenshots and the other by a keyboard-only test.
- **Layout shift.** The footer jumped when the app rendered, which dropped the mobile Lighthouse score to 93 (CLS 0.159). Reserving space for the main area and footer brought CLS to 0.
- **A subtle validation bug.** Range checks compared objects with `JSON.stringify`, which is sensitive to key order, so valid codes were rejected as "impossible". The round-trip tests caught it, and comparison is now field by field.

## What I learned

- Offline-first is mostly about **edge cases** (redirects, cache versioning, deep links, lazily loaded chunks), so you have to test with the network actually off, not just assume it works.
- **Privacy can be an accessibility feature.** "No account, nothing left behind" removes a real barrier on shared devices. Wiping storage properly takes more than `localStorage.clear()`: session storage, IndexedDB, Cache Storage and the service worker all need handling.
- **Security claims must match the threat model.** Calling a client-side checksum "tamper-proof" would mislead people. Saying exactly what it guarantees (typo detection) and what it doesn't (forgery) is more useful.
- Automated accessibility checks give a good baseline, but they **don't replace looking and listening**. Screenshots caught a contrast failure that axe passed.
- Small is achievable: a complete learning app in about 15 KB gzipped, with no framework.

## Limitations

- One topic (fractions) with three skills. No mixed numbers, multiplication/division or word problems yet. English only.
- Resume codes catch typos but **are not forgery-proof** (by design; see above).
- The 6-question pre/post check is indicative, not a validated assessment.
- Read-aloud depends on the device having speech voices. If speech isn't supported, the button is hidden.
- "Leave no trace" can't erase browser history, the HTTP cache from before the service worker took over, or OS-level logs. The end screen says so and recommends a private window on shared computers.
- A QR link works offline only on a device that has loaded the app once. The intended flow is to scan while still on library Wi-Fi.
- Not yet tested with real screen readers, on real low-end Android hardware, or in Safari/iOS (see the [manual checklist](docs/manual-test-checklist.md)). Practice counters saturate at 31 correct / 63 attempts per skill.

## Deploying (not done yet)

The app is fully static: no backend and no environment variables. Once approved:
1. Create a GitHub repo and push this local repo (it hasn't been pushed anywhere yet).
2. Import the repo into Vercel (framework preset: *Other* or *Vite*). `vercel.json` sets the build command, the `dist` output, immutable caching for `/assets/*`, `no-cache` for `sw.js`, and security headers. Alternatively, run `npx vercel` and then `npx vercel --prod`.
3. On the live URL, re-run the offline check and Lighthouse. QR codes use `location.origin`, so they will point at the production URL automatically.

## Credits, AI disclosure, and pre-existing work

- **Content:** topics and solution strategies follow *Prealgebra 2e* (Chapter 4, "Fractions") by Lynn Marecek, MaryAnne Anthony-Smith and Andrea Honeycutt Mathis, © OpenStax / Rice University, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Access for free at <https://openstax.org/details/books/prealgebra-2e>. **Changes:** no OpenStax text, figures or exercises were copied. All problems, hints and worked steps are original and generated by code.
- **Statistic:** Pew Research Center, "Nearly one-in-five teens can't always finish their homework because of the digital divide," Monica Anderson & Andrew Perrin, Oct 26, 2018. <https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/>
- **Libraries:** qrcode-generator (MIT, Kazuhiko Arase; "QR Code" is a registered trademark of DENSO WAVE). Dev-only: Vite, TypeScript, Vitest, Playwright, @axe-core/playwright (axe-core, MPL-2.0), Lighthouse, serve.
- **AI disclosure:** most of the code, tests and documentation were drafted by an AI assistant (Grok Bot) working at Tejas Chaudhari's direction. Tejas chose the problem, the users, the scope, the privacy/"honest crypto" design constraints and the accessibility targets, and reviews and tests the work. Git commits made by the assistant are authored as "Grok Bot (AI assistant for Tejas Chaudhari)".
- **Pre-existing work:** none. All code, content and assets were created during the Oct 17 – Nov 20, 2026 build window. The only third-party code is the open-source libraries listed above.
- **Team:** Tejas Chaudhari (solo).
