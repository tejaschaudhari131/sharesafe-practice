# Devpost submission draft: ShareSafe Practice

> Draft for Tejas to review. Nothing has been submitted. Replace [DEMO_URL], [REPO_URL] and [VIDEO_URL] before submitting.

**Project name:** ShareSafe Practice

**Elevator pitch (196 characters):**
Digital-safety lessons for students on shared library PCs and old phones: no account, works offline, accessible, private by default, in English and Spanish, and teachers can load any pack.

**Links:** Demo: [DEMO_URL] · Code: [REPO_URL] · Video: [VIDEO_URL]

**Built with:** typescript, vite, html5, css3, service-workers, pwa, web-speech-api, indexeddb, qrcode-generator, vitest, playwright, axe-core, lighthouse, vercel

---

## Inspiration

In Pew Research Center's 2018 survey of U.S. teens ages 13–17, **17% said they are often or sometimes unable to complete homework because they don't have reliable access to a computer or internet connection**. 12% said they at least sometimes use public Wi-Fi for schoolwork because they have no home internet. And 35% said they often or sometimes do homework on a cellphone, rising to 45% among teens in households earning under $30,000 a year. ([Pew Research Center, 2018](https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/))

Those students work on library computers with time limits, shared family phones and old Androids with little data. Many learning tools quietly assume a personal device, an account, and a fast connection. Shared devices and public networks also create a privacy problem: logging a student into an account on a public computer isn't a safe default. And the safety lessons students need — what a 403 means, who should see a file, how to spot a scam message — often live behind that same account-and-bandwidth wall.

I wanted to see how far I could get with the opposite assumptions: **no account, no personal data, no connection needed, and nothing left behind**, without giving up real learning or accessibility — and to make the lessons themselves something a teacher can write, export, and hand out as a QR code.

## What it does

ShareSafe Practice is a tiny offline-first web app that plays **content packs**. The same player handles every pack; packs are just data.

- **Permission to Learn (the default pack, in English and Spanish).** A student hits a confusing "403 Forbidden" screen, gets a plain-language explanation, then sets *no access / view / edit* for three fictional files — a class roster, a shared group project, and personal notes — with feedback on least privilege ("That's more access than this file needs").
- **Spot the Scam.** Three fictional student-facing messages — a fake scholarship, a look-alike login, and a legitimate school notice — each with red and green flags explained. All domains use the reserved `.example` TLD, and every message is badged as fictional.
- **Fractions.** Generated fractions practice (equivalent fractions, adding and subtracting, comparing), kept as a third pack to show any subject can be loaded.
- **Every pack** has a short **pre-check → lesson → post-check**, then a before/after result.
- **Teacher pack builder** (no backend): a form to write questions, a **live byte counter**, **export/import JSON**, and a **printable QR handout** that puts the whole pack in the URL hash, with a size warning when it will not fit.
- **No account, no personal data.** Open it and start.
- **Works offline after one visit.** The first load is about 28.5 KB gzipped (Lighthouse reports 30 KiB transferred). Packs, the builder and the QR library are lazy chunks, all precached.
- **Leave no trace (on by default).** Progress stays only in the open tab. **End session** wipes everything the app stored (local and session storage, IndexedDB, and optionally the offline copy) and confirms what it removed.
- **Resume code + QR.** An 18-character code restores progress **and which pack** you were in, on any device. Scan the QR with a phone before leaving the library, and you can keep going at home without internet.
- **Accessible, in English and Spanish.** Full keyboard use, visible focus, text size and high-contrast toggles, a **plain-language** toggle, **read-aloud**, and a language switcher that sets `<html lang>` so a screen reader switches pronunciation.

**A concrete before and after:** Maya, a 7th grader with no home internet, has 30 minutes on a library PC and an old phone with almost no data. *Maya is an illustrative scenario, not a real student.*

- **Before:** a typical account-based lesson site needs an email sign-up first. It stores her session on a shared machine, and it can't be used at home without internet.
- **After:** she starts immediately with no sign-up, picks Permission to Learn, and takes the pre-check (2/6). She works through the 403 explanation and the file-access practice, scans her resume code with her phone, and taps **End session** so the library PC keeps nothing. At home she keeps going offline, takes the post-check (5/6), and sees **"Before 2/6 → After 5/6 (+3)"**.

*(The scores are illustrative; this exact flow is covered by an automated end-to-end test.)*

## How I built it

- **Stack:** TypeScript and Vite with no UI framework, so the bundle stays small. The only runtime library is `qrcode-generator`, and it is loaded only when a QR is shown.
- **Packs are data.** Each pack declares skills, intro, pre/post items and practice items (`choice`, `access`, or `message`), with standard and plain-language wording and an optional Spanish variant. `validatePack()` checks imported and teacher-built packs. Built-in packs are lazy `import()` chunks, so the first load does not pay for every lesson.
- **Grading:** multiple-choice by id; access grids per role, with *too open* / *too tight* notes so the feedback teaches least privilege, not just "incorrect".
- **Resume code (version 2):** a 10-bit pack hash, a 14-bit seed, stage, scores and counters = 80 bits, plus a 10-bit CRC, written as 18 Crockford base32 characters. CRC-10 catches every single wrong character and every swap of neighbours (tested exhaustively). **It is a checksum, not a signature**: it does not stop deliberate forgery, because with no server any "secret key" in the page would be public. The app says this plainly. A code for a teacher pack restores only if that pack is already loaded.
- **Builder:** live JSON and share-link sizes, export/import, and a print handout with the pack in `#p=…`. Above about 2,500 characters it refuses the QR and recommends sharing the file instead.
- **Offline:** a post-build script generates a service worker that precaches every built file, versioned by a content hash.
- **Privacy:** sessionStorage by default, no network requests after load, no analytics, and a strict Content-Security-Policy (`default-src 'self'`).
- **AI assistance:** I used an AI assistant (Grok Bot) to draft much of the code, tests, lesson text, Spanish translation and documentation. I set the problem, users, scope and design constraints (privacy, honest crypto, accessibility targets, pack format) and reviewed the work. The repo README discloses this, and the assistant's commits are labelled.

## Challenges I ran into

- **Pack size vs. first load.** Bilingual packs with plain-language variants are large (~12 KB gzipped each), so they are lazy chunks. The first load grew from about 15 KB to about 28.5 KB gzipped, which still scores 100 on mobile Lighthouse.
- **Fitting a pack into the resume code.** Version 1 had no spare bits. Version 2 shrank the seed and the counters to make room for a 10-bit pack hash, keeping 18 characters and the same typo-detection guarantees.
- **A QR that holds a whole lesson.** A few short questions fit in a scannable link; a big pack does not. The builder shows live sizes and switches from "fits" to "dense" to "too large — share the file".
- **Keyboard behaviour of radio groups.** The access grid is many radio groups; Tab reaches each group and arrow keys change the choice. The tests drive exactly that.
- **"Tamper-proof" vs. honest.** An HMAC with a key shipped in client code only *looks* secure. I kept a checksum with provable typo detection and documented exactly what it does and doesn't do.
- **Fictional but realistic scam examples** that teach without looking like a real email: every one is badged as fictional and uses `.example` domains.

## Accomplishments that I'm proud of

- **Lighthouse 100** for Performance, Accessibility, Best Practices and SEO on both mobile and desktop. The first load transfers about 30 KiB, and in a throttled test the app is usable in about 1.7 s on emulated 2G and about 1.75 s on Slow 3G.
- **0 axe-core violations** across 20 scans: 9 views in default mode and in high-contrast + extra-large text + plain-language mode, plus the Spanish home and the teacher builder.
- **43 automated tests**, all passing:
  - 30 unit tests: pack validation, a 9,000-problem fractions correctness sweep, and exhaustive checks that every single-character typo and every swap of neighbouring characters in a resume code is detected.
  - 13 end-to-end tests: a full keyboard-only Permission to Learn journey, offline mode (including a lazy pack), the QR deep link, leave-no-trace, Spanish and accessibility toggles, Spot the Scam and Fractions from the picker, the teacher builder, and an "End session" test that confirms storage, caches, service workers and IndexedDB are all empty afterwards.
- A complete learning loop — 403 explanation, least-privilege practice, scam flags, before/after scores — that a teacher can extend with a pack file, with no backend.

## What I learned

- A content-pack format makes "offline, no account" reusable for any subject, and keeps lessons reviewable as plain data.
- Feedback that says *how* an answer is wrong (too open vs. too tight) teaches more than "incorrect".
- Translation is more than strings: `lang` attributes, speech language, and saying plainly when content is not translated (the fractions problems stay in English).
- Offline-first is all about edge cases (redirects, cache versions, deep links, lazy chunks), so test with the network actually off.
- Security claims have to match the threat model. Precisely describing what a checksum guarantees is better than overclaiming.
- Automated accessibility checks are a baseline, not a verdict. They caught a duplicate landmark; only real assistive-technology testing will show the rest.

## What's next for ShareSafe Practice

- Manual testing with NVDA, VoiceOver and TalkBack, on real low-end Android phones, and in Safari/iOS (a checklist is already written). Review of the Spanish by a native speaker, and testing with students, have not happened yet.
- Builder support for access grids and message cards, and Spanish teacher packs.
- More packs, and optional teacher-verifiable codes using a teacher-held signing key, kept separate from the private self-practice mode.
