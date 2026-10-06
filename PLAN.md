# DDIA Quest — Plan

A gamified, interactive course through *Designing Data-Intensive Applications*, 2nd ed. (Kleppmann & Riccomini, 2026), grounded in [MISSION.md](MISSION.md): **better data-system decisions at work + senior system-design interviews**.

Lessons teach every section in original explanations, simulations and quizzes, and point to the matching chapter section in your copy. They do not reproduce the book's text, so read the book alongside the game.

## How the game works

| Mechanic | What it does | Why (learning science) |
|---|---|---|
| **Regions** | One per chapter (Ch 0 Base Camp → Ch 14 Grand Gauntlet). Unlock by beating the previous boss, or switch on Free Roam. | Clear progression; each region fits in working memory. |
| **Levels** | Each lesson takes 10–15 minutes and teaches one skill: a short explanation, then simulators, quizzes, ordering, sorting, estimates and incidents. You get feedback on every answer right away. | Knowledge first, then effortful practice. |
| **Recall Run** | Each level opens with due review cards from *earlier* levels. | Retrieval practice + spacing + interleaving. |
| **Daily Review** | A deck that uses Leitner boxes (1→2→4→8→16→32 days) and mixes topics. | Builds long-term memory (storage strength). |
| **Bosses** | One per region: an interview-style design fight with an HP bar. | Practises the interview half of the mission. |
| **Side quests** | One per region: apply the chapter to a real system at work. | Practises the work half of the mission. |
| **XP, stars, combos, streaks, ranks** | Level 100 XP, boss 300, quest 150. Stars come from first-try accuracy. Ranks run Intern → Junior → Engineer → Senior → Staff → Principal → Distinguished. | Motivation and visible progress. |
| **Fair quizzes** | All answer options are the same length, so the formatting gives nothing away. | Tests knowledge, not test-taking. |

## Curriculum (detail per level in `assets/levels/chNN.js`)

| # | Region | Book chapter (2e) | 1st ed. | Levels |
|---|---|---|---|---|
| 0 | ⛺ Base Camp | Before you start | — | 0.1 Placement Run |
| 1 | 🧭 The Crossroads | Trade-offs in Data Systems Architecture | new | Operational vs analytical · Warehouses, lakes & ETL · Systems of record vs derived · Cloud vs self-hosting · Distributed vs single-node · Data, law & society |
| 2 | 🗼 Latency Lighthouse | Defining Nonfunctional Requirements | Ch 1 | Home timelines case study · Latency/response time/throughput · **Percentiles & tail latency (built)** · Reliability · Scalability · Maintainability |
| 3 | 🏛️ Model Market | Data Models and Query Languages | Ch 2 | Relational vs document · Normalization & many-to-many · Star schemas · Graph models · Declarative queries & DataFrames · Event sourcing & CQRS |
| 4 | ⛏️ Storage Caves | Storage and Retrieval | Ch 3 | Logs & hash indexes · SSTables & LSM · B-trees · LSM vs B-tree · Secondary/covering indexes · Column storage · Full-text & vector search |
| 5 | ⚒️ Schema Forge | Encoding and Evolution | Ch 4 | Encoding formats · Protobuf & Avro · Backward/forward compatibility · Dataflow via DBs & services · Workflows, durable execution & events |
| 6 | 🏝️ Replica Isles | Replication | Ch 5 | Single-leader · Failover & replication logs · Replication-lag anomalies · Multi-leader & sync engines · Leaderless & quorums · Version vectors |
| 7 | 🏔️ Shard Peaks | Sharding | Ch 6 | Range vs hash · Skew & hot keys · Rebalancing · Request routing · Secondary indexes |
| 8 | 🏰 Transaction Keep | Transactions | Ch 7 | ACID · Read committed & snapshot isolation · Lost updates, write skew, phantoms · Serializability · Distributed transactions & 2PC |
| 9 | 🌫️ The Fog | The Trouble with Distributed Systems | Ch 8 | Partial failures · Unreliable networks · Unreliable clocks · Pauses, leases & fencing · System models |
| 10 | ⛰️ Consensus Summit | Consistency and Consensus | Ch 9 | Linearizability · CAP · ID generators & logical clocks · Consensus (Raft) · Coordination services |
| 11 | 🏭 Batch Factory | Batch Processing | Ch 10 | Unix tools · DFS & object stores · MapReduce → dataflow · Batch joins · Batch use cases |
| 12 | 🌊 Stream Rapids | Stream Processing | Ch 11 | Brokers vs logs · CDC & event sourcing · Time & windows · Stream joins · Exactly-once |
| 13 | ⚖️ The Compass | Doing the Right Thing | Ch 12 (part) | Bias & accountability · Privacy & tracking · Data protection law |
| 14 | 🐉 Grand Gauntlet | Whole-book capstone | — | Interleaved gauntlet · Capstone design doc · Final 45-min mock interview |

Every region from 1 to 13 also has a **side quest** (work) and a **boss** (interview). In total that's about 80 levels, 14 bosses and 14 side quests.

## Architecture

```
index.html               world map: player card, regions, level details, settings   ✅
review.html              Daily Review deck (spaced repetition across all chapters)    ✅
assets/game.css          design system (light/dark tokens, components)                ✅
assets/game.js           engine: state, XP, ranks, streaks, Leitner review,           ✅
                         lesson HUD + gating, quiz/order/classify/recall/estimate/scenario/recallRun
assets/regions.js        the 15 regions and their unlock graph                         ✅
assets/levels/chNN.js    levels, bosses, quests, review cards per chapter             ✅ (plan data)
lessons/NNLL-slug.html   lesson files: NN = chapter, LL = level (90 = quest, 99 = boss)
reference/chNN-*.html    printable cheat sheet per lesson/chapter (add each to SHELF in index.html)
```

### Lesson authoring contract
- Load `../assets/game.css` and `../assets/game.js` (with `data-root="../"`), then call `Quest.lesson({ id, region })`.
- Structure: hero → Recall Run → short explanation steps (`.q-step`, cited) → interactive practice (gated with `.q-step.locked`) → "read in the book" pointer → `#q-finish`.
- Every lesson: recommends a primary source, links to neighbouring lessons and reference sheets, and reminds the learner to ask Claude follow-up questions.
- Fill in the level's `file` and 4–6 `review` cards in `assets/levels/chNN.js`.

## Status & next steps
1. ✅ Workspace: mission, resources, notes.
2. ✅ Design system + game engine.
3. ✅ Curriculum for the whole book (plan data for every region and level).
4. ✅ Foundation: `index.html` (map), `review.html`, Placement Run `lessons/0001-placement-run.html`, model lesson `lessons/0203-percentiles.html` + `reference/ch02-percentiles.html`. Headless-Chromium smoke test plays through all of them (desktop, mobile 390px, dark mode).
5. ⏳ Waiting on the learner: play the Placement Run and paste the results into chat → write learning records, set pace in MISSION.md, pick the next lesson.
6. ⏸️ Later (paused at your request): a fleet of agents to plan each chapter in detail, build every lesson, then verify them in Chromium.
