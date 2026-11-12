# ShareSafe Practice

> Digital-safety lessons for students who share devices or have unreliable internet: no account, works offline, accessible, private by default, and a resume code carries progress anywhere.

**AccessED Hacks entry** · Solo entrant: Tejas Chaudhari · Build window **Oct 17 – Nov 20, 2026** · Pre-existing work: **none** (everything in this repo was created during the build window).

Demo: [DEMO_URL] · Video: [VIDEO_URL] · Repo: [REPO_URL]

---

## Contents
1. [Problem](#problem)
2. [Intended users](#intended-users)
3. [Solution](#solution)
4. [Judging criteria map](#judging-criteria-map)
5. [Tools](#tools) · [Setup](#setup) · [Challenges](#challenges) · [What I learned](#what-i-learned) · [Limitations](#limitations)
6. [Deploying](#deploying-not-done-yet) · [Credits, AI disclosure, pre-existing work](#credits-ai-disclosure-and-pre-existing-work)

---

## Problem

In Pew Research Center's 2018 survey of U.S. teens ages 13–17, **17% said they are often or sometimes unable to complete homework because they lack reliable access to a computer or internet connection**. 12% said they at least sometimes use public Wi-Fi for schoolwork because they have no home internet, and 35% said they often or sometimes do homework on a cellphone, rising to 45% among teens in households earning under $30,000 a year. ([Pew Research Center, Anderson & Perrin, Oct 26, 2018](https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/))

Those students work on library PCs, school laptops, shared family phones and public Wi-Fi. That creates two barriers at once:

1. **Access barrier.** Most learning tools assume an account, a personal device and a steady connection.
2. **Safety barrier.** Shared devices and public networks are exactly where students meet confusing errors ("403 Forbidden"), over-shared files, and scam messages — yet digital-safety lessons usually live behind the same account-and-bandwidth wall.

## Intended users

- **Primary:** middle-school and early high-school students who mostly use shared/public computers or low-end phones with limited data.
- **Also:** students who use a keyboard only, a screen reader, larger text or high contrast, plain language, read-aloud, or Spanish.
- **Secondary:** teachers, librarians and after-school staff who want to hand out a lesson with a printed QR code and no logins to manage.

## Solution

ShareSafe Practice is a tiny offline-first web app (PWA) that plays **content packs**. Packs are data files; the same player handles every pack.

- **Permission to Learn (default pack, English + Spanish).** A student hits a confusing "403 Forbidden" screen, gets a plain-language explanation, then sets *no access / view / edit* for three fictional files — a class roster, a shared group project, and personal notes — with feedback on least privilege ("That's more access than this file needs").
- **Spot the Scam.** Three fictional student-facing messages — a fake scholarship, a look-alike login, and a legitimate school notice — each with red/green flags explained. All domains use the reserved `.example` TLD.
- **Fractions.** The original generated fractions practice, kept as a third pack to show any subject can be loaded.
- **Every pack:** a short **pre-check → lesson → post-check** with before/after results.
- **Teacher pack builder** (lazy-loaded, no backend): a form to write questions, a **live byte counter**, **export/import JSON**, and a **printable QR handout** that puts the whole pack in the URL hash, with a size warning when it won't fit.
- **No account, no personal data. Works offline after one load. Leave-no-trace by default** (session storage only; *End session* wipes storage, IndexedDB, and optionally the offline copy).
- **Resume code + QR.** An 18-character code (with a 2-character checksum) restores progress **and the pack** on any device.
- **Accessible:** keyboard-only, screen-reader friendly, text size, high contrast, plain language, read-aloud, and an English/Spanish switcher that sets `<html lang>` correctly.

---

## Judging criteria map

The four criteria are equally weighted; each section below maps to one.

### 1. Barrier Removed

**Barriers addressed:** needing an account, a personal device, or a reliable connection; privacy risk on shared machines; and safety lessons that are themselves locked behind those requirements.

*Scenario (illustrative):* Maya, a 7th grader with no home internet, has 30 minutes on a library PC and an old phone with almost no data.

| | **Before** (typical account-based lesson site) | **After** (ShareSafe Practice) |
|---|---|---|
| Getting started | Make an account with an email before the first question. | Open the page, pick *Permission to Learn*, press **Start the pre-check**. No sign-up, no name. |
| On the library PC | Login and progress sit on a shared machine. | Progress lives only in that tab. **End session** wipes it (tested to 0 items left). |
| Taking it home | Needs internet to load and sync. | Scan the resume-code QR on library Wi-Fi; the phone caches the app and restores the same pack. |
| At home, offline | Can't load. | Works offline, including lazily loaded packs. |
| Data cost | Heavy pages. | ~31 KiB transferred on first load (Lighthouse); usable in ~1.7 s on emulated 2G. |
| Result | Depends on account, device and connection. | Pre-check 2/6 → post-check 5/6, shown as **"Before 2/6 → After 5/6 (+3)"**. *These numbers are illustrative*; the same flow is reproduced by the e2e test "full journey reaches before/after results". |

### 2. Learning Value

- **A concrete, confusing moment as the hook.** Permission to Learn starts from a realistic 403 screen and explains what it means: you reached the server, and it is not allowed to show you this file.
- **Practice that transfers.** Students set permissions per person for three different files. Feedback says whether the choice is *too open* or *too tight*, then explains least privilege for that file. Hints and worked steps are available; viewing steps counts as an attempt, not a correct answer.
- **Spot the Scam teaches checks, not fear:** compare the real domain, notice urgency, never send passwords or bank details, open known sites yourself — and recognise that a routine notice from the known domain is fine.
- **Measurable growth.** Each pack has a 6-question pre-check and a *different* 6-question post-check on the same concepts, with before/after scores. *Caveat:* 6 items are indicative, not a validated assessment.
- **Any subject.** The fractions pack (OpenStax-aligned, procedurally generated, 9,000-problem correctness sweep) and the teacher builder show the player isn't tied to one topic.

### 3. Inclusive Experience

**Design features**
- Semantic HTML, one `h1` per view, focus moved to each new heading, a skip link as the first Tab stop, labelled fieldsets for every radio group (including each role in the access grid), and live regions for feedback.
- Full keyboard use, a visible 3 px focus ring, and 44 px targets.
- Text size (100/125/150%), high contrast, plain language for every instruction, hint and explanation, and read-aloud (speech language follows the UI language).
- **Spanish:** all UI strings, plus full Spanish versions of Permission to Learn and Spot the Scam. The language switcher sets `<html lang="es">` and its own `lang`, so screen readers switch pronunciation. The fractions problems stay in English, and the app says so.
- Fictional-content badges on every message and file, so nothing looks like a real email or a real student's data.
- Low bandwidth: no frameworks, web fonts, trackers or third-party requests. Packs, the builder, fractions and QR code are lazy chunks, all precached for offline use.

**Testing evidence (honest)** — recorded Nov 12, 2026 against the production build in headless Google Chrome:
- **axe-core (WCAG 2.0/2.1/2.2 A & AA + best practices): 0 violations in 20 scans** — 9 views (home, pre-check, 403 intro, access practice + hint, access feedback, group project, resume code, end session, about) in default and high-contrast + extra-large + plain-language modes, plus the Spanish home and the teacher builder. `docs/reports/axe-results.json`.
- **Lighthouse 13.6:** Accessibility **100**, Performance **100**, Best Practices **100**, SEO **100** on mobile and desktop. Mobile FCP/LCP 1.1 s, TBT 0 ms, CLS 0. `docs/reports/lighthouse-*.report.html`.
- **Keyboard-only e2e:** pre-check, the 403 intro, setting roster permissions with arrow keys, a wrong answer, a hint, a correct answer, the resume code, and restoring it in a fresh browser.
- **Caught during this build:** axe flagged two regions with the same name on the 403 screen (fixed), and the access grid's first test run showed duplicated feedback text (fixed).
- **Not yet done:** no testing with a real screen reader (NVDA, VoiceOver, TalkBack), on real low-end hardware, or in Safari/iOS, and no testing with students or native Spanish speakers. See [`docs/manual-test-checklist.md`](docs/manual-test-checklist.md). Automated tools cannot certify WCAG conformance, and **no conformance claim is made**.

### 4. Working Prototype & Explanation

- **It runs:** `npm install && npm run build && npm run preview`, then open http://localhost:4173. Screenshots (desktop 1280×800 and mobile 360×740) are in `docs/screenshots/`.
- **Tests:** 30 unit tests (Vitest) and 13 end-to-end tests (Playwright), all passing; 3 more Playwright tests regenerate screenshots on demand.

**How it works**
- **Packs** (`src/pack.ts`, `src/packs/*`): typed data — skills, intro, pre/post items, practice items (`choice`, `access`, or `message`), hints, steps, explanations, flags — each string with `std`/`plain` and optional `es`. `validatePack()` checks imported/teacher packs. Built-in packs are lazy `import()` chunks.
- **Grading** (`src/grade.ts`): choices by id; access grids per role, reporting *too open* / *too tight*.
- **Resume code** (`src/resume.ts`, v2): 3-bit version, **10-bit pack hash**, 14-bit seed, stage, pre/post counts and bitmasks, per-skill counters and hints = 80 bits, plus a 10-bit CRC → 18 Crockford base32 characters. CRC-10 catches every single wrong character and every swap of neighbours (tested exhaustively). **It is a checksum, not a signature**: it does not stop deliberate forgery, and the app says so. A code for a teacher pack restores only if that pack is loaded.
- **Builder** (`src/builder.ts`): builds a pack, shows JSON bytes and share-link length, exports/imports JSON, and prints a QR handout with the pack base64url-encoded in `#p=…`. Above ~2,500 characters it refuses the QR and recommends sharing the file.
- **Storage / offline:** sessionStorage by default, localStorage only on opt-in; a post-build script precaches every built file in a versioned service worker. Strict CSP (`default-src 'self'`).

---

## Tools

TypeScript, Vite 6, vanilla DOM; [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT); Service Worker, Cache Storage, Web Speech API, Web Storage, IndexedDB (only to delete leftovers); Vitest, Playwright, @axe-core/playwright, Lighthouse 13.6. AI assistance: Grok Bot (see disclosure). Hosting planned on Vercel (`vercel.json` included), not yet deployed.

## Setup

```bash
npm install
npm run dev          # dev server (service worker disabled in dev)
npm run build        # type-check + build + generate dist/sw.js
npm run preview      # serve dist/ at http://localhost:4173
npm test                                      # unit tests
npm run build && npx playwright test          # e2e, axe, throttling
SCREENSHOTS=1 npx playwright test screenshots # regenerate docs/screenshots
```

**Bundle (gzip):** first load = `index.html` 1.0 KB + `style.css` 2.4 KB + `index.js` 25.2 KB ≈ **28.5 KB** (Lighthouse: 30 KiB transferred including manifest and icon). Lazy chunks, all precached: Permission to Learn 11.8 KB, Spot the Scam 12.3 KB, builder 3.0 KB, fractions 2.9 KB + 0.8 KB, QR 7.8 KB. Whole `dist/` ≈ 75 KB gzipped.

## Challenges

- **Pack size vs. first load.** Bilingual packs with plain-language variants are big (~12 KB gzipped each), so they are lazy chunks; the first load grew from ~15 KB to ~28 KB gzipped, which still scores 100 on mobile Lighthouse.
- **Fitting a pack into the resume code.** The code had no spare bits, so version 2 shrank the seed to 14 bits and the counters to 4/5 bits to make room for a 10-bit pack hash, keeping 18 characters and the same checksum guarantees.
- **A QR that holds a whole lesson.** A few short questions fit in a scannable link; a big pack doesn't. The builder shows live JSON and URL sizes and switches from "fits" to "dense" to "too large — share the file".
- **Keyboard behaviour of radio groups.** The access grid is many radio groups; Tab reaches each group and arrow keys change the choice. The tests drive exactly that.
- **Fictional but realistic scam examples** that teach without looking like a real email: every one is badged as fictional and uses `.example` domains.

## What I learned

- A content-pack format makes "offline, no account" reusable for any subject, and keeps lessons reviewable as plain data.
- Feedback that says *how* an answer is wrong (too open vs. too tight) teaches more than "incorrect".
- Translation is more than strings: `lang` attributes, speech language, and saying plainly when content is not translated.
- Automated accessibility checks are a baseline. They caught a duplicate landmark, but only real assistive-technology testing will show the rest.

## Limitations

- Three packs; Spanish covers the UI, Permission to Learn and Spot the Scam, not fractions. The Spanish has not been reviewed by a native speaker.
- Teacher-built packs are multiple choice only (no access grids or message cards in the builder yet) and English only.
- Resume codes catch typos but **are not forgery-proof**. A code for a custom pack only restores on a device where that pack is loaded.
- Pre/post checks are 6 items, indicative only. Results for these packs are illustrative; no student testing has happened.
- QR handouts work only for small packs. A teacher pack in the URL hash is readable by anyone with the link (it should never contain student data).
- Leave-no-trace can't erase browser history or OS-level logs. A QR link works offline only on a device that has loaded the app once.
- **Not yet tested** with real screen readers, on real low-end devices, or in Safari/iOS.

## Deploying (not done yet)

Fully static. Once approved: push to GitHub, import into Vercel (`vercel.json` sets the build, `dist` output, caching and security headers), then re-run Lighthouse and the offline check on the live URL. QR codes use `location.origin`, so they will point at the deployed site automatically.

## Credits, AI disclosure, and pre-existing work

- **Fractions content:** topics follow *Prealgebra 2e*, Chapter 4, by Lynn Marecek, MaryAnne Anthony-Smith and Andrea Honeycutt Mathis, © OpenStax / Rice University, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), <https://openstax.org/details/books/prealgebra-2e>. No OpenStax text was copied; problems are generated.
- **Permission to Learn and Spot the Scam:** original. All names (e.g. "Ms. Rivera", "Lincoln Middle School"), files, messages and domains are fictional. No real student data is used.
- **Statistic:** Pew Research Center, Anderson & Perrin, Oct 26, 2018, <https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/>.
- **Libraries:** qrcode-generator (MIT). Dev-only: Vite, TypeScript, Vitest, Playwright, @axe-core/playwright (MPL-2.0), Lighthouse, serve.
- **AI disclosure:** most of the code, tests, lesson text, Spanish translation and documentation were drafted by an AI assistant (Grok Bot) at Tejas Chaudhari's direction. Tejas chose the problem, users, direction and constraints, and reviews the work. Commits by the assistant are authored as "Grok Bot (AI assistant for Tejas Chaudhari)".
- **Pre-existing work:** none. **Team:** Tejas Chaudhari (solo).
