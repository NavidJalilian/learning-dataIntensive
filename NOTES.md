# Teacher Notes

## Preferences
- **Gamified learning.** The user wants lessons as a game with a nice UI: XP, ranks, streaks, boss fights, side quests. Every lesson plugs into the shared engine in `assets/game.js` and appears on the map at `index.html`.
- **Two-sided mission.** Work decisions and interviews (see MISSION.md). Every region has an interview-style **boss** and a real-work **side quest**.

## Working notes
- The curriculum lives in two places that must stay in sync: `PLAN.md` (readable) and `assets/levels/chNN.js` (drives the map). When a lesson is built, set its `file` field and add 4–6 `review` cards there, and add its cheat sheet to `SHELF` in `index.html`.
- Lessons call `Quest.lesson({ id, region, title })`; level ids are like `"4.2"`, bosses `"4.boss"`, quests `"4.quest"`.
- **No placement test.** The learner said they are completely new to the book and asked to drop the Placement Run (2026-10-06). It was removed; start every chapter from its first level. See learning-records/0001.
- Edition is assumed to be **DDIA 2nd edition** (2026). If the user has the 1st edition, use the chapter mapping in PLAN.md.
- WebFetch is egress-blocked in cloud sessions for oreilly.com / martin.kleppmann.com / dataintensive.net; only search snippets were available when building the plan. Verify section coverage against the user's copy when building each lesson.
- Quiz rule enforcement: every `options` array must have equal word counts, and the correct option must not be the longest. Check with a quick node script over lessons/*.html and assets/levels/*.js before committing.
- Placed classify tags are disabled buttons; `.q-bucket .q-tag { pointer-events: none }` in game.css stops them swallowing bucket clicks. Keep it.
- Web fetches are egress-blocked in cloud sessions for most sites (cacm, sre.google, wikipedia, acolyer). WebSearch snippets work; verify claims there before writing them into lessons.
- Run locally with `python3 -m http.server 8765` from the repo root. Plain static files, no build step.
- WebFetch to oreilly.com and medium.com returns 403 from the desktop app too. For Ch 1 facts, the full 2nd-ed. chapter was checked against the community Chinese translation (Vonng) at https://ddia.vonng.com/ch1/ (Table 1-1, the four reasons for warehouses, HTAP, product analytics).
