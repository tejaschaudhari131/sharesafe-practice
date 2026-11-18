# Manual tests Tejas must run himself

Automated checks are already done and reported in the README’s Honest Testing Matrix. **Do not mark any row below as done unless you actually ran it.** Record the result and any bug in the blanks. After a fix, re-test that row and note the date.

**Build / commit:** ____________ (`git rev-parse --short HEAD`)
**URL:** ☐ local preview `http://localhost:4173` ☐ LAN `http://____________:4173` ☐ deployed [DEMO_URL]
**Date:** ____________ **Tester:** Tejas Chaudhari

Result key: ✅ pass · ⚠️ works with issues (describe the bug) · ❌ fail · — not tested

> After deploy, use the live URL for every phone and QR row. A localhost QR is not scannable from a phone. Start each run from a clean private window or after clearing site data.

---

## 1. Screen reader, English

**Setup:** ☐ VoiceOver + Safari (macOS)  version ______    ☐ NVDA + Chrome or Firefox (Windows)  version ______

| # | What to do | Result | Bug / notes |
|---|---|---|---|
| 1.1 | Tab: first stop is “Skip to main content”, and it moves focus to main. | | |
| 1.2 | Start Permission to Learn. Each new view announces its heading. Feedback after Check answer is announced (`aria-live`). | | |
| 1.3 | On the 403 intro, the mock error is clearly a lesson, not a real browser error. “403 Forbidden” may be announced in English (it is marked `lang=en`). | | |
| 1.4 | In the access grid, each role is a labelled group; arrow keys change no access / view / edit. | | |
| 1.5 | Open a Spot the Scam message. The fictional badge, flags, and `.example` address are announced. | | |
| 1.6 | Resume code is spelled character by character. A typo is announced as a typo. | | |
| 1.7 | Teacher Verify: paste a completion code; pack name and pre/post scores are announced, including the not-forgery-proof note. | | |
| 1.8 | Escape twice: the “press Escape again” hint is announced, then the wipe confirmation. | | |

## 2. Screen reader, Spanish

**Setup (same tool as above, or note if different):** ______

| # | What to do | Result | Bug / notes |
|---|---|---|---|
| 2.1 | Switch the UI to Español. Confirm the voice or pronunciation changes (`html lang=es`). | | |
| 2.2 | Walk the home screen and Permission to Learn pre-check in Spanish. Headings, buttons, and questions are in Spanish. | | |
| 2.3 | Open Everyday Fractions in Spanish. The problem prompt, buttons, and hints/steps (if opened) are in Spanish. “403 Forbidden” and `.example` addresses may stay English and should be marked `lang=en`. | | |
| 2.4 | Read aloud (app button) uses a Spanish voice and does not clash badly with the screen reader. | | |

## 3. Safari, desktop

**macOS ______ · Safari ______**

| # | What to do | Result | Bug / notes |
|---|---|---|---|
| 3.1 | Full Permission to Learn journey (pre-check, 403, practice, isomorphic post-check, mastery card). | | |
| 3.2 | Live regions announce feedback. Focus moves to the new heading on each step. | | |
| 3.3 | Add to Dock / Home if you test PWA install. Offline reload from that icon works. | | |
| 3.4 | Wipe session really clears site data (Safari → Settings → Privacy, or Web Inspector → Storage). | | |
| 3.5 | 200% zoom: no clipped text, resume code wraps, access grid still usable. | | |

## 4. iPhone and Android, airplane-mode resume (after deploy)

**Do this only on the deployed HTTPS URL.** Device A: ________ (iPhone iOS ____)  Device B: ________ (Android ____)

| # | What to do | Result | Bug / notes |
|---|---|---|---|
| 4.1 | On a library-style desktop (or your laptop), start a pack, get a resume or completion code / on-screen QR. | | |
| 4.2 | **iPhone:** scan the on-screen QR (or type the code) on the **deployed** URL. Confirm the same pack and scores restore. | | |
| 4.3 | Turn on **airplane mode**, reload, confirm the offline banner, and continue one more question. | | |
| 4.4 | Repeat 4.2–4.3 on **Android**. | | |
| 4.5 | A pack **not** opened before airplane mode should fail to load until it has been fetched once. Note what actually happens. | | |

## 5. Printed QR handout (after deploy)

| # | What to do | Result | Bug / notes |
|---|---|---|---|
| 5.1 | In Teacher pack builder, write one short question so the byte counter says the pack fits a QR. Print the handout (or print to PDF and print that). | | |
| 5.2 | Confirm the print layout: title, short instructions, QR, and the full URL as text. No header chrome, no cut-off QR. | | |
| 5.3 | Scan the **paper** QR with the iPhone camera and with the Android camera. The pack loads with no account. | | |
| 5.4 | If the pack is too large, confirm the size warning and that no broken QR is offered. | | |

## 6. Spanish review (fluent speaker)

**Reviewer:** ____________ (☐ you, if fluent  ☐ a fluent adult peer)  **Date:** ____________

| # | What to do | Result | Bug / notes |
|---|---|---|---|
| 6.1 | Read all UI chrome (buttons, storage badge, wipe confirmation, Teacher Verify, errors) in Spanish. Mark wording that is unnatural, Spain-only, or unclear for a school audience. | | |
| 6.2 | Read Permission to Learn and Spot the Scam in Spanish (pre, lesson, post, hints). | | |
| 6.3 | Read Everyday Fractions prompts, hints and steps in Spanish. | | |
| 6.4 | Confirm nothing looks like a real email, school, or student record. | | |

---

## Bugs found (copy into the README “Verified Manual” section after you run these)

| ID | Where | What happened | Fixed? |
|---|---|---|---|
| | | | ☐ yes ☐ no |
| | | | ☐ yes ☐ no |
| | | | ☐ yes ☐ no |

**Still not tested after this pass:** ______________________
