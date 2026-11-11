# Manual testing checklist (for Tejas)

Automated checks (axe, Lighthouse, Playwright) are all passing. This checklist covers what they can't: real assistive technology, real hardware and Safari. Fill in the blanks, then copy the results into the README's "Inclusive Experience" section. Report results honestly, including failures and anything you skipped.

**Tester:** ____________ **Date:** ____________ **Build / commit:** ____________ (`git rev-parse --short HEAD`)
**URL tested:** ☐ local preview `http://localhost:4173` ☐ LAN `http://____________:4173` ☐ deployed [DEMO_URL]

Result key: ✅ pass · ⚠️ works with issues · ❌ fail · — not tested

> Tip: start each run from a clean state (clear site data, or use a fresh private window) so you see the first-load experience.

---

## A. Core journey (repeat in each setup below)

1. Load the home screen and start the pre-check.
2. Answer all 6 pre-check questions (get some wrong on purpose).
3. In practice: give a wrong answer, open hints 1 to 3, show worked steps, go to the next problem, answer correctly, and switch skill.
4. Open the resume code, then use Read aloud / Spell it out.
5. Toggle text size, high contrast and plain language.
6. End session with "Also remove the offline copy" ticked, and confirm.
7. Restore the code from step 4 (on a new device or a fresh private window).

---

## B. NVDA + Firefox or Chrome (Windows)

NVDA version: ______ · Browser + version: ______

| # | Check | Result | Notes |
|---|---|---|---|
| B1 | The first Tab stop is "Skip to main content", and it moves focus to the main area | | |
| B2 | Each new view announces its heading (h1) when it appears | | |
| B3 | The problem is read clearly, with fractions as "3 over 4" and the blank as "blank", not "slash" or "question mark" | | |
| B4 | Answer inputs announce their labels ("Numerator (top)", "Missing number"), and the radio group announces "Choose the symbol" | | |
| B5 | Feedback ("Correct!" / "Not quite…") is announced automatically after Check answer | | |
| B6 | Hints and worked steps are announced when opened, and the fraction-bar images read their descriptions | | |
| B7 | Toggle buttons announce their pressed/not pressed state | | |
| B8 | The resume code is read character by character, and the QR has a sensible name | | |
| B9 | The restore error ("This code has a typo…") is announced | | |
| B10 | The results table is navigable with table commands, and the headers are read | | |
| B11 | The whole journey (A1–A7) can be done with NVDA and the keyboard only | | |

## C. VoiceOver + Safari (macOS and/or iOS)

macOS ______ / iOS ______ · Safari version: ______ · Device: ______

| # | Check | Result | Notes |
|---|---|---|---|
| C1 | The rotor (Headings / Form controls) lists the expected items on the practice screen | | |
| C2 | Fractions are spoken as "over", and the operators as "plus" / "minus" / "equals" | | |
| C3 | Feedback and hints are announced (live regions work in Safari) | | |
| C4 | iOS: swipe navigation reaches every control. Double-tap works on the radios and on Check answer | | |
| C5 | iOS: the numeric keyboard appears for the answer inputs | | |
| C6 | Read aloud works in Safari, and no audio overlaps with VoiceOver in a confusing way | | |
| C7 | Safari: "Add to Home Screen" works, and the app opens offline from the home screen (airplane mode) | | |
| C8 | Safari: End session removes the data (check Settings → Safari → Advanced → Website Data, or Web Inspector → Storage) | | |
| C9 | No layout breaks at 320 px width or with the largest Dynamic Type / Safari zoom | | |

## D. TalkBack + Chrome (Android)

Android version: ______ · Chrome version: ______ · Device model / year: ______

| # | Check | Result | Notes |
|---|---|---|---|
| D1 | Swipe through the practice screen: everything reachable, in a logical order | | |
| D2 | Fractions, the blank and the operators are spoken correctly | | |
| D3 | Feedback is announced after Check answer | | |
| D4 | Radios (compare) can be selected and are announced as checked | | |
| D5 | Read aloud works alongside TalkBack (pause TalkBack if needed, and note what happens) | | |

## E. Real low-end phone + network

Device: ______ (RAM ____ GB, Android ____) · Network: ☐ mobile data ☐ throttled Wi-Fi ☐ other ______

| # | Check | Result | Notes |
|---|---|---|---|
| E1 | First load time on a real mobile connection (stopwatch, from tapping the link to seeing "Start the pre-check") | ____ s | |
| E2 | Footer says "Ready to work offline." within ____ s | | |
| E3 | Airplane mode, then reload: the app loads and the offline banner shows | | |
| E4 | Airplane mode: practice, hints and the resume code/QR screen all work | | |
| E5 | Scanning the QR from a library/desktop screen opens the app and restores progress | | |
| E6 | Text is readable and targets are easy to tap at Normal / Large / Extra large, with no horizontal scrolling | | |
| E7 | High contrast is readable outdoors / in bright light | | |
| E8 | Typing a code by hand on the phone keyboard works (lowercase, spaces, O vs 0) | | |
| E9 | Battery/heat: anything noticeable after 10 minutes of use? | | |

## F. Shared / library computer simulation

Browser: ______ · OS: ______

| # | Check | Result | Notes |
|---|---|---|---|
| F1 | Default mode: close the tab and reopen the site, and progress is gone (as intended) | | |
| F2 | With "Save progress on this device" ticked, progress survives a reload | | |
| F3 | End session (without removing the offline copy): DevTools → Application shows no Local/Session Storage or IndexedDB for the site, and the app still works offline | | |
| F4 | End session (with removing the offline copy): Cache Storage and the service worker are also gone | | |
| F5 | After End session, the browser Back button doesn't reveal previous answers | | |
| F6 | 200% browser zoom plus Extra large text: everything is still usable (WCAG 1.4.4 / 1.4.10) | | |
| F7 | Windows High Contrast / forced-colors mode: buttons, focus ring and fraction lines stay visible | | |

## G. Content check (fresh eyes)

| # | Check | Result | Notes |
|---|---|---|---|
| G1 | Do 10 practice problems per skill, checking the answers and steps by hand. Any errors or confusing wording? | | |
| G2 | Is the plain-language wording actually simpler and still accurate? | | |
| G3 | Is the hint order helpful (not giving the answer away in hint 1)? | | |

---

## Summary to paste into the README

- Screen readers tested: ______________________
- Real devices tested: ______________________
- Issues found: ______________________ (fixed? ☐ yes ☐ no, logged as gaps)
- Not tested: ______________________
