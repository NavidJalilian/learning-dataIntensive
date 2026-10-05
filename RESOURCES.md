# Data-Intensive Systems Resources

## Knowledge

- [Book: _Designing Data-Intensive Applications_, 2nd ed. — Martin Kleppmann & Chris Riccomini (O'Reilly, 2026)](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/)
  The spine of the whole curriculum; every region on the map is one chapter. 13 chapters, from "Trade-offs in Data Systems Architecture" to "Doing the Right Thing". Use for: the primary reading assigned in every lesson.
- [Lecture series: _Distributed Systems_ (8 lectures) — Martin Kleppmann, University of Cambridge](https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB) · [lecture notes PDF](https://www.cl.cam.ac.uk/teaching/2122/ConcDisSys/dist-sys-notes.pdf)
  Same author, free, rigorous, with exercises. Use for: Ch 6, 9 and 10 (system models, clocks, replication, Raft), whenever the book feels too dense.
- [Reference: _Consistency Models_ map — Jepsen (Kyle Kingsbury)](https://jepsen.io/consistency/models)
  The canonical map of how isolation and consistency guarantees relate, based on published research. Use for: Ch 8 and Ch 10, and for the "linearizable vs serializable" questions that come up in interviews.
- [Blog: DDIA reading-group index — Murat Demirbas (_Metadata_)](http://muratbuffalo.blogspot.com/2024/12/index-for-designing-data-intensive.html)
  A distributed-systems professor's chapter-by-chapter notes from a reading group. Use for: a second expert view after finishing each chapter.
- [Excerpt: "The Cloud & Doing the Right Thing" — _The Pragmatic Engineer_](https://newsletter.pragmaticengineer.com/p/designing-data-intensive-applications-book-excerpt)
  Excerpt from the 2nd edition. Use for: Ch 1 (cloud vs self-hosting) and Ch 13 (ethics).

## Wisdom (Communities)

- [r/ExperiencedDevs](https://www.reddit.com/r/ExperiencedDevs/)
  Moderated for engineers with 3+ years' experience. Use for: sanity-checking architecture trade-offs you'd propose at work, and interview-loop experiences.
- [r/dataengineering](https://www.reddit.com/r/dataengineering/)
  Large, active practitioner community. Use for: Ch 11–12 questions (batch and stream pipelines, CDC, warehouses).
- [Papers We Love](https://paperswelove.org/)
  Meetups that read CS papers together; many DDIA citations come up there. Use for: going deeper on a chapter's original papers with other people.
- At work: your team's design-review meeting.
  Use for: the side quests on the map. Bring a DDIA-framed trade-off to a real review.

## Gaps

- **Mock-interview partners.** No vetted peer mock-interview community chosen yet. Until one is, Claude plays the interviewer for boss fights.
- **2nd-edition section-level table of contents.** Only chapter titles were verified (O'Reilly listing and search results). Check level coverage against your own copy as each lesson is built.
