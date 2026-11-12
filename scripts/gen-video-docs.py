#!/usr/bin/env python3
"""Generates docs/demo-video-script.md and docs/demo-video-captions.srt from one source,
so narration and captions always match. Run: python3 scripts/gen-video-docs.py"""
import re, textwrap

SCENES = [
 (0, 12, "Title card: \"ShareSafe Practice\" + pitch line. Then cut to a library-style desktop browser on the home screen, with the three packs visible.",
  "Seventeen percent of U.S. teens say they often or sometimes can't finish homework because they lack reliable computer or internet access. That's from Pew Research Center, 2018."),
 (12, 28, "Home screen. Point to the pack picker (Permission to Learn, Spot the Scam, Fractions), the privacy card, and the unchecked \"Save progress on this device\" box.",
  "ShareSafe Practice is digital-safety lessons for students like Maya, a seventh grader on a library computer with an old phone at home. No account, no name, and nothing saved after she closes the tab, unless she chooses to."),
 (28, 42, "Press Tab: the skip link appears. Keep tabbing to Permission to Learn and \"Start the pre-check\", then press Enter. Answer one question with the keyboard. Show the progress bar.",
  "Everything works from the keyboard. She picks Permission to Learn and starts a six-question pre-check. No hints here, it just shows where she begins."),
 (42, 70, "403 intro: the mock 403 screen, then the plain-language explanation. Continue to access practice on the class roster. Choose a too-open setting, show \"Not quite\" and the too-open note, open a hint, then answer correctly.",
  "The lesson opens on a confusing 403 Forbidden screen, then explains it in plain language. Then she practises least privilege: who can view or edit a class roster. If she grants too much access, the feedback says so."),
 (70, 88, "Toggle Text size to Extra large, turn on High contrast, then Plain language. Press the language switcher: the UI and lesson switch to Spanish, and the html lang attribute changes. Switch back to English. Optionally press \"Read aloud\".",
  "Students can make the text bigger, switch to high contrast, or turn on plain language. A language switcher sets Spanish, including the lesson, and updates the page language so a screen reader switches too."),
 (88, 108, "Turn the toggles back off. Open \"Resume code\": show the 18-character code and the QR. Scan it with a real phone; the phone shows \"Progress restored\" and the same pack.",
  "Before leaving the library, Maya gets her resume code, or scans the QR with her phone. It carries her progress and which pack she was in, with no account and no server. The last two characters catch typos, not forgery, and the app says so honestly."),
 (108, 122, "On the phone: switch on airplane mode, reload, and show the \"You are offline\" banner. Continue the next file or question in the same pack.",
  "The first load is about twenty-eight kilobytes, and packs are cached after one visit. So at home, with no internet, it still works."),
 (122, 135, "Back on the library PC: press \"End session\", tick \"Also remove the offline copy\", confirm. Show the \"Session ended\" screen listing what was wiped.",
  "On the shared computer, End session wipes everything the app stored, including the offline copy if she wants, and confirms what it removed."),
 (135, 150, "Phone: the results screen \"Before 2/6 → After 5/6 (+3)\". Brief cut to the teacher pack builder with the byte counter and a printed QR handout. Then an end card: Lighthouse 100 ×4, 0 axe violations, 43 tests passing, English and Spanish, [DEMO_URL] / [REPO_URL].",
  "Then the post-check shows her growth. Teachers can build a pack, watch the byte count, and print a QR handout. Lighthouse scores a hundred in every category, axe finds no violations, and real screen reader testing is next. ShareSafe Practice."),
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
md = [f"""# ShareSafe Practice: demo video script (2:30)

Target length **2:30** · about {wc} words of narration (about {round(wc/2.5)} words per minute, an unhurried pace) · captions: [`demo-video-captions.srt`](demo-video-captions.srt) (generated from this script by `scripts/gen-video-docs.py`, so they match word for word).

**Before recording**
- Run `npm run build && npm run preview`, or use the deployed [DEMO_URL]. Clear site data first so you start from the home screen, in English, with default display settings.
- Set the browser zoom to 100% and the window to about 1280×800, and hide bookmarks.
- Have an Android phone on the same Wi-Fi to scan the QR. On localhost the QR points to `localhost`, which a phone can't open, so either record the phone part against the deployed URL, or open the LAN address (`http://<your-ip>:4173`) on the PC so the QR encodes it. The service worker needs HTTPS or localhost, so use the deployed URL for the phone offline segment.
- Turn on system text-to-speech if you include the read-aloud moment.
- Keep the scenario consistent: use **Permission to Learn**, get 2 of 6 right in the pre-check and 5 of 6 in the post-check, so the end screen shows +3. Those scores are illustrative.
- For the builder cutaway, have a short valid pack ready so the byte counter and QR handout are visible.
- Only claim what's true. No real-student testing, no real screen-reader testing, and no native-speaker review of the Spanish has happened yet, so don't imply they have.

| Time | On screen | Narration |
|---|---|---|"""]
for start, end, action, narr in SCENES:
    md.append(f"| {ts(start, False)}–{ts(end, False)} | {action} | {narr} |")
md.append("""
**Production notes**
- Capture the screen at 1080p. Show key presses (for example with a keystroke overlay) during the keyboard segment (0:28–0:42).
- For the phone shots, record the phone screen or film it. Make sure airplane mode is visible at 1:48.
- Add the captions file in the video platform (YouTube: Subtitles → Upload file → With timing).
- The source is linked in the description: Pew Research Center (2018), https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/
- Keep the final video at 3:00 or shorter. Check the AccessED Hacks rules for the exact limit.
""")
open('docs/demo-video-script.md', 'w').write("\n".join(md))
print(wc, "words;", n - 1, "captions")
