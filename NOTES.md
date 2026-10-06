# Teacher Notes

## Preferences
- **Gamified learning.** The user wants lessons as a game with a nice UI: XP, ranks, streaks, boss fights, side quests. Every lesson plugs into the shared engine in `assets/game.js` and appears on the map at `index.html`.
- **Two-sided mission.** Work decisions and interviews (see MISSION.md). Every region has an interview-style **boss** and a real-work **side quest**.

## Working notes
- The curriculum lives in two places that must stay in sync: `PLAN.md` (readable) and `assets/curriculum.js` (drives the map). When a lesson is built, set its `file` field in `curriculum.js`.
- Lessons call `DDIAQuest.complete("<level id>", {score, xp})`; level ids are like `"4.2"`, bosses `"4.boss"`, quests `"4.quest"`.
- Background/prior knowledge is **unknown**. Level 0.1 (Placement Run, built) exists to find the zone of proximal development. It ends with a "Copy results for Claude" box: when the user pastes it, write learning records from it (one per clearly-known / clearly-new cluster, plus stated prior knowledge), and fill the weekly time budget into MISSION.md constraints.
- Edition is assumed to be **DDIA 2nd edition** (2026). If the user has the 1st edition, use the chapter mapping in PLAN.md.
- WebFetch is egress-blocked in cloud sessions for oreilly.com / martin.kleppmann.com / dataintensive.net; only search snippets were available when building the plan. Verify section coverage against the user's copy when building each lesson.
- Quiz rule enforcement: every `options` array must have equal word counts, and the correct option must not be the longest. Check with a quick node script over lessons/*.html and assets/levels/*.js before committing.
- Placed classify tags are disabled buttons; `.q-bucket .q-tag { pointer-events: none }` in game.css stops them swallowing bucket clicks. Keep it.
- Web fetches are egress-blocked in cloud sessions for most sites (cacm, sre.google, wikipedia, acolyer). WebSearch snippets work; verify claims there before writing them into lessons.
