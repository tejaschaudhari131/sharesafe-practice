# ShareSafe Practice: demo video script (2:30)

Target length **2:30** · about 293 words of narration (about 117 words per minute, an unhurried pace) · captions: [`demo-video-captions.srt`](demo-video-captions.srt) (generated from this script by `scripts/gen-video-docs.py`, so they match word for word).

**Before recording**
- Run `npm run build && npm run preview`, or use the deployed [DEMO_URL]. Clear site data first so you start from the home screen, in English, with default display settings.
- Set the browser zoom to 100% and the window to about 1280×800, and hide bookmarks.
- Have an Android phone on the same Wi-Fi to scan the QR. On localhost the QR points to `localhost`, which a phone can't open, so either record the phone part against the deployed URL, or open the LAN address (`http://<your-ip>:4173`) on the PC so the QR encodes it. The service worker needs HTTPS or localhost, so use the deployed URL for the phone offline segment.
- Turn on system text-to-speech if you include the read-aloud moment.
- Keep the scenario consistent: use **Permission to Learn**, get 2 of 6 right in the pre-check and 5 of 6 in the post-check, so the end screen shows +3. Those scores are illustrative.
- For the builder cutaway, have a short valid pack ready so the byte counter and QR handout are visible.
- Only claim what's true. No real-student testing, no real screen-reader testing, and no native-speaker review of the Spanish has happened yet, so don't imply they have.

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:12 | Title card: "ShareSafe Practice" + pitch line. Then cut to a library-style desktop browser on the home screen, with the three packs visible. | Seventeen percent of U.S. teens say they often or sometimes can't finish homework because they lack reliable computer or internet access. That's from Pew Research Center, 2018. |
| 0:12–0:28 | Home screen. Point to the pack picker (Permission to Learn, Spot the Scam, Fractions), the privacy card, and the unchecked "Save progress on this device" box. | ShareSafe Practice is digital-safety lessons for students like Maya, a seventh grader on a library computer with an old phone at home. No account, no name, and nothing saved after she closes the tab, unless she chooses to. |
| 0:28–0:42 | Press Tab: the skip link appears. Keep tabbing to Permission to Learn and "Start the pre-check", then press Enter. Answer one question with the keyboard. Show the progress bar. | Everything works from the keyboard. She picks Permission to Learn and starts a six-question pre-check. No hints here, it just shows where she begins. |
| 0:42–1:10 | 403 intro: the mock 403 screen, then the plain-language explanation. Continue to access practice on the class roster. Choose a too-open setting, show "Not quite" and the too-open note, open a hint, then answer correctly. | The lesson opens on a confusing 403 Forbidden screen, then explains it in plain language. Then she practises least privilege: who can view or edit a class roster. If she grants too much access, the feedback says so. |
| 1:10–1:28 | Toggle Text size to Extra large, turn on High contrast, then Plain language. Press the language switcher: the UI and lesson switch to Spanish, and the html lang attribute changes. Switch back to English. Optionally press "Read aloud". | Students can make the text bigger, switch to high contrast, or turn on plain language. A language switcher sets Spanish, including the lesson, and updates the page language so a screen reader switches too. |
| 1:28–1:48 | Turn the toggles back off. Open "Resume code": show the 18-character code and the QR. Scan it with a real phone; the phone shows "Progress restored" and the same pack. | Before leaving the library, Maya gets her resume code, or scans the QR with her phone. It carries her progress and which pack she was in, with no account and no server. The last two characters catch typos, not forgery, and the app says so honestly. |
| 1:48–2:02 | On the phone: switch on airplane mode, reload, and show the "You are offline" banner. Continue the next file or question in the same pack. | The first load is about twenty-eight kilobytes, and packs are cached after one visit. So at home, with no internet, it still works. |
| 2:02–2:15 | Back on the library PC: press "End session", tick "Also remove the offline copy", confirm. Show the "Session ended" screen listing what was wiped. | On the shared computer, End session wipes everything the app stored, including the offline copy if she wants, and confirms what it removed. |
| 2:15–2:30 | Phone: the results screen "Before 2/6 → After 5/6 (+3)". Brief cut to the teacher pack builder with the byte counter and a printed QR handout. Then an end card: Lighthouse 100 ×4, 0 axe violations, 43 tests passing, English and Spanish, [DEMO_URL] / [REPO_URL]. | Then the post-check shows her growth. Teachers can build a pack, watch the byte count, and print a QR handout. Lighthouse scores a hundred in every category, axe finds no violations, and real screen reader testing is next. ShareSafe Practice. |

**Production notes**
- Capture the screen at 1080p. Show key presses (for example with a keystroke overlay) during the keyboard segment (0:28–0:42).
- For the phone shots, record the phone screen or film it. Make sure airplane mode is visible at 1:48.
- Add the captions file in the video platform (YouTube: Subtitles → Upload file → With timing).
- The source is linked in the description: Pew Research Center (2018), https://www.pewresearch.org/short-reads/2018/10/26/nearly-one-in-five-teens-cant-always-finish-their-homework-because-of-the-digital-divide/
- Keep the final video at 3:00 or shorter. Check the AccessED Hacks rules for the exact limit.
