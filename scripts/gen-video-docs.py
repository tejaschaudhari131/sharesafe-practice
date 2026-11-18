#!/usr/bin/env python3
"""Generates docs/demo-video-script.md and docs/demo-video-captions.srt from one source,
so narration and captions always match. Run: python3 scripts/gen-video-docs.py"""
import re, textwrap

SCENES = [
 (0, 22, "Title card: \"ShareSafe Practice\" + pitch line. Cut to a simulated library-PC browser on the home screen, with Digital Survival Curriculum and the Everyday Fractions teacher-pack demo visible. No presenter or bio on screen.",
  "Seventeen percent of U.S. teens say they often or sometimes can't finish homework because they lack reliable computer or internet access. That's Pew Research Center, 2018. Many of those students work on shared library computers, public Wi-Fi, or throttled phones, where creating an account is a privacy risk and a dropped signal wipes the work."),
 (22, 58, "Permission to Learn: miss a 2-item pre-check (show 0/2). Continue to the mock 403, then the class-roster access exercise. Take the 2-item isomorphic post-check (same ideas, new details). Hold on the Before/After Mastery card, Before 0/2 → After 2/2 (+2), and the completion code.",
  "Maya starts Permission to Learn with no login. She misses a two-question pre-check about a 403 error. The lesson explains the 403, then she practises least privilege on a class roster. A new two-question post-check asks the same ideas with different details. The Before/After Mastery card shows her growth, and says this is immediate transfer, not long-term retention."),
 (58, 90, "Copy the 18-character code. Point to the storage badge: 0 bytes of progress on the device; the app-shell cache stores no progress. Press Wipe session, or Escape twice, confirm, and show the session-ended screen. Cut to a phone in airplane mode: enter the code; the same pack restores offline.",
  "She copies an 18-character completion code. Leave-no-trace mode stores zero bytes of progress on the device. Wipe session, or Escape twice, clears the tab and confirms. On her phone, in airplane mode, she enters the code and the same pack comes back offline."),
 (90, 118, "Toggle English to Spanish. Show Everyday Fractions in Spanish (html lang=es). If, and only if, a real VoiceOver or NVDA clip has been recorded, play 8–10 seconds of it reading the Spanish interface. Then flash the Honest Testing Matrix: automated scores, emulated keyboard and 320px checks, and the manual tests still to do.",
  "A language switcher sets Spanish, including Everyday Fractions, and updates the page language so a screen reader can switch voices. Our honest testing matrix lists automated scores, emulated keyboard and zoom checks, and the manual tests still to do, including real screen readers."),
 (118, 145, "Teacher pack builder: add one short multiple-choice question, show the live byte counter, print the QR handout. Scan it with a phone camera; the pack loads with no backend. Paste the student completion code into Teacher Verify; pack name and pre/post scores appear, with the typo-versus-forgery note. End card: Lighthouse 100 ×4, 0 axe violations, [DEMO_URL] / [REPO_URL].",
  "A teacher writes a short question, watches the byte count, and prints a QR handout. Scanning the code loads the pack with no backend. Pasting the student code into Teacher Verify shows the pack and the pre and post scores. The checksum catches typos; it is not forgery-proof. ShareSafe Practice."),
]

def ts(sec, srt=True):
    m, s = divmod(sec, 60)
    whole = int(s); ms = int(round((s - whole) * 1000))
    return f"00:{int(m):02d}:{whole:02d},{ms:03d}" if srt else f"{int(m)}:{whole:02d}"

def chunks(text, limit=84):
    sents = [x.replace('U§S§', 'U.S.') for x in re.split(r'(?<=[.!?])\s+', text.replace('U.S.', 'U§S§'))]
    out = []
    for s in sents:
        out += textwrap.wrap(s, limit) if len(s) > limit else [s]
    return out

srt, n = [], 1
for start, end, _, narr in SCENES:
    parts = chunks(narr); words = [len(p.split()) for p in parts]; total = sum(words)
    t = float(start)
    for p, w in zip(parts, words):
        d = (end - start) * w / total
        lines = textwrap.wrap(p, 42)
        srt.append(f"{n}\n{ts(t)} --> {ts(min(end, t + d) - 0.05)}\n" + "\n".join(lines) + "\n")
        n += 1; t += d
open('docs/demo-video-captions.srt', 'w').write("\n".join(srt))

wc = sum(len(s[3].split()) for s in SCENES)
md = [f"""# ShareSafe Practice: demo video script (2:25)

Target length **2:25** · about {wc} words of narration (about {round(wc/2.42)} words per minute) · captions: [`demo-video-captions.srt`](demo-video-captions.srt) (generated from this script by `scripts/gen-video-docs.py`, so they match word for word).

**Before recording**
- Run `npm run build && npm run preview`, or use the deployed [DEMO_URL]. Clear site data first so you start from the home screen, in English, with default display settings. Record in clean 1080p at about 125% browser zoom so UI text is legible.
- Set the window to about 1280×800 and hide bookmarks.
- Have a phone on the same Wi-Fi to scan the QR. On localhost the QR points to `localhost`, which a phone can't open, so record the phone parts against the deployed URL, or open the LAN address (`http://<your-ip>:4173`) on the PC. The service worker needs HTTPS or localhost, so use the deployed URL for the airplane-mode segment.
- Keep the scenario consistent: **Permission to Learn**, miss both pre-check items (0/2) and get both post-check items right (2/2), so the mastery card shows +2. Those scores are illustrative of the flow.
- For the builder cutaway, have a short valid question ready so the byte counter and QR handout are visible.
- **Screen-reader audio:** include 8–10 seconds of live VoiceOver or NVDA reading the Spanish UI **only if that clip has actually been recorded**. If it has not, show the Spanish UI and the Honest Testing Matrix, and do not imply that a real screen-reader test was filmed.
- Do not introduce a presenter, a school, or a personal background. Only claim what's true.

| Time | On screen | Narration |
|---|---|---|"""]
for start, end, action, narr in SCENES:
    md.append(f"| {ts(start, False)}–{ts(end, False)} | {action} | {narr} |")
md.append("""
**Production notes**
- Capture the screen at 1080p. Show key presses during the keyboard or Escape-twice moment if it is in the cut.
- For the phone shots, record the phone screen or film it. Make sure airplane mode is visible in the 0:58–1:30 segment.
- Add the captions file in the video platform (YouTube: Subtitles → Upload file → With timing).
- The source is linked in the description: Pew Research Center (2018), https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/
- Keep the final video at 3:00 or shorter. Check the AccessED Hacks rules for the exact limit.
""")
open('docs/demo-video-script.md', 'w').write("\n".join(md))
print(wc, "words;", n - 1, "captions")
