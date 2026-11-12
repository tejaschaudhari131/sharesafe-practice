# Manual testing checklist (for Tejas)

Automated checks (axe, Lighthouse, Playwright) are all passing. This checklist covers what they can't: real assistive technology, real hardware, Safari, and a native-speaker read of the Spanish. Fill in the blanks, then copy the results into the README's "Inclusive Experience" section. Report results honestly, including failures and anything you skipped.

**Tester:** ____________ **Date:** ____________ **Build / commit:** ____________ (`git rev-parse --short HEAD`)
**URL tested:** ☐ local preview `http://localhost:4173` ☐ LAN `http://____________:4173` ☐ deployed [DEMO_URL]
**Language used:** ☐ English ☐ Spanish ☐ both

Result key: ✅ pass · ⚠️ works with issues · ❌ fail · — not tested

> Tip: start each run from a clean state (clear site data, or use a fresh private window) so you see the first-load experience.

---

## A. Core journey (repeat in each setup below)

Default pack, unless a row says otherwise.

1. Load the home screen. Confirm three packs are listed (Permission to Learn, Spot the Scam, Fractions). Start **Permission to Learn**.
2. Answer all 6 pre-check questions (get some wrong on purpose).
3. Read the 403 intro: the mock 403 looks like an error page, the explanation is in plain language, and it is clearly a lesson (not a real blocked site).
4. In access practice (class roster): give a *too open* answer, open a hint, then answer correctly. Confirm the feedback says *too open* or *too tight*, not only "Not quite". Repeat for the group project and personal notes if time allows.
5. Open the resume code, then use Read aloud / Spell it out. Confirm the code is 18 characters.
6. Toggle text size, high contrast and plain language. Switch the language to Spanish and confirm the heading, buttons and `<html lang>` change; switch back.
7. End session with "Also remove the offline copy" ticked, and confirm.
8. Restore the code from step 5 (on a new device or a fresh private window) and confirm it reopens **Permission to Learn**, not another pack.

**Optional, once per tester:**
9. From home, open **Spot the Scam**, open one message, and confirm it is badged as fictional and uses a `.example` domain.
10. From home, open **Fractions**, answer one problem (including a hint or worked steps if shown).
11. Open the **Teacher pack builder**, type a short question, watch the byte counter update, export JSON, and (if the pack is small enough) preview the QR handout.

---

## B. NVDA + Firefox or Chrome (Windows)

NVDA version: ______ · Browser + version: ______

| # | Check | Result | Notes |
|---|---|---|---|
| B1 | The first Tab stop is "Skip to main content", and it moves focus to the main area | | |
| B2 | Each new view announces its heading (h1) when it appears | | |
| B3 | The 403 intro is announced as a lesson, not as a real browser error, and the explanation is read in full | | |
| B4 | In the access grid, each role is a labelled radio group; arrow keys change no access / view / edit, and the checked option is announced | | |
| B5 | Answer inputs and choice groups announce their labels. In Fractions, quantities are read as "3 over 4" (or similar), not "slash" | | |
| B6 | Feedback ("Correct!" / "Not quite…", including *too open* / *too tight*) is announced automatically after Check answer | | |
| B7 | Hints and worked steps are announced when opened. Scam message flags and fictional-content badges are announced | | |
| B8 | Toggle buttons (text size, high contrast, plain language, language) announce their pressed/not pressed state. Switching to Spanish changes NVDA's pronunciation (html lang=es) | | |
| B9 | The resume code is read character by character, and the QR has a sensible name | | |
| B10 | The restore error ("This code has a typo…") is announced | | |
| B11 | The results table is navigable with table commands, and the headers are read | | |
| B12 | The teacher builder fields, byte counter and size warning are announced | | |
| B13 | The whole journey (A1–A8) can be done with NVDA and the keyboard only | | |

## C. VoiceOver + Safari (macOS and/or iOS)

macOS ______ / iOS ______ · Safari version: ______ · Device: ______

| # | Check | Result | Notes |
|---|---|---|---|
| C1 | The rotor (Headings / Form controls) lists the expected items on the access-practice screen and on a scam message | | |
| C2 | The 403 intro, access options, and (in Fractions) "over" / "plus" / "minus" / "equals" are spoken clearly | | |
| C3 | Feedback and hints are announced (live regions work in Safari) | | |
| C4 | iOS: swipe navigation reaches every control, including each role in the access grid. Double-tap works on the radios and on Check answer | | |
| C5 | iOS: the numeric keyboard appears for Fractions answer inputs | | |
| C6 | Read aloud works in Safari, and no audio overlaps with VoiceOver in a confusing way. Read-aloud language follows the UI language | | |
| C7 | Safari: "Add to Home Screen" works, and the app opens offline from the home screen (airplane mode), including a pack already visited | | |
| C8 | Safari: End session removes the data (check Settings → Safari → Advanced → Website Data, or Web Inspector → Storage) | | |
| C9 | No layout breaks at 320 px width or with the largest Dynamic Type / Safari zoom | | |
| C10 | A `#p=…` pack link and a `#r=…` resume-code link both open and work in Safari | | |

## D. TalkBack + Chrome (Android)

Android version: ______ · Chrome version: ______ · Device model / year: ______

| # | Check | Result | Notes |
|---|---|---|---|
| D1 | Swipe through the access-practice screen and a scam message: everything reachable, in a logical order | | |
| D2 | 403 explanation, access options, flags and (in Fractions) the blank and operators are spoken correctly | | |
| D3 | Feedback is announced after Check answer | | |
| D4 | Radios (access levels, and Fractions compare) can be selected and are announced as checked | | |
| D5 | The language switcher is reachable and TalkBack switches voice/language when the UI is in Spanish | | |
| D6 | Read aloud works alongside TalkBack (pause TalkBack if needed, and note what happens) | | |

## E. Real low-end phone + network

Device: ______ (RAM ____ GB, Android ____) · Network: ☐ mobile data ☐ throttled Wi-Fi ☐ other ______

| # | Check | Result | Notes |
|---|---|---|---|
| E1 | First load time on a real mobile connection (stopwatch, from tapping the link to seeing the pack list / "Start the pre-check") | ____ s | |
| E2 | Footer says "Ready to work offline." within ____ s | | |
| E3 | Airplane mode, then reload: the app loads and the offline banner shows | | |
| E4 | Airplane mode: a pack already visited (Permission to Learn or Spot the Scam), hints and the resume code/QR screen all work | | |
| E5 | A pack *not* visited before airplane mode: what happens? (expected: it cannot load until it has been fetched once) | | |
| E6 | Scanning the resume-code QR from a library/desktop screen opens the app and restores the same pack and progress | | |
| E7 | Text is readable and targets are easy to tap at Normal / Large / Extra large, with no horizontal scrolling | | |
| E8 | High contrast is readable outdoors / in bright light | | |
| E9 | Typing a code by hand on the phone keyboard works (lowercase, spaces, O vs 0) | | |
| E10 | Battery/heat: anything noticeable after 10 minutes of use? | | |

## F. Shared / library computer simulation

Browser: ______ · OS: ______

| # | Check | Result | Notes |
|---|---|---|---|
| F1 | Default mode: close the tab and reopen the site, and progress is gone (as intended) | | |
| F2 | With "Save progress on this device" ticked, progress survives a reload, including the selected pack | | |
| F3 | End session (without removing the offline copy): DevTools → Application shows no Local/Session Storage or IndexedDB for the site, and the app still works offline | | |
| F4 | End session (with removing the offline copy): Cache Storage and the service worker are also gone | | |
| F5 | After End session, the browser Back button doesn't reveal previous answers | | |
| F6 | 200% browser zoom plus Extra large text: everything is still usable, including the access grid (WCAG 1.4.4 / 1.4.10) | | |
| F7 | Windows High Contrast / forced-colors mode: buttons, focus ring, the mock 403, message cards and access options stay visible | | |

## G. Content check (fresh eyes)

| # | Check | Result | Notes |
|---|---|---|---|
| G1 | Permission to Learn: walk through all three files. Are the least-privilege answers and the *too open* / *too tight* notes accurate and clear? | | |
| G2 | Spot the Scam: are the flags accurate? Does anything look like a real email or a real school message? (Every item should be clearly fictional and use `.example` domains.) | | |
| G3 | Fractions: do 10 practice problems per skill, checking the answers and steps by hand. Any errors or confusing wording? | | |
| G4 | Is the plain-language wording actually simpler and still accurate, in both packs that have it? | | |
| G5 | Spanish: is the UI and the Permission / Scam pack wording natural and accurate? Note anything a native speaker would change. (Fractions problems are English only; the app should say so.) | | |
| G6 | Is the hint order helpful (not giving the answer away in hint 1)? | | |
| G7 | Teacher builder: export, import, and print a small pack's QR handout. Does the warning appear when the pack is too large? | | |

---

## Summary to paste into the README

- Screen readers tested: ______________________
- Real devices tested: ______________________
- Spanish reviewed by a native speaker? ☐ yes ☐ no
- Issues found: ______________________ (fixed? ☐ yes ☐ no, logged as gaps)
- Not tested: ______________________
