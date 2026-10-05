/* DDIA Quest — game engine.
 *
 * Every page loads this file:  <script src="../assets/game.js" data-root="../"></script>
 * `data-root` is the path from the page back to the repo root ("" for index.html, "../" for lessons/).
 *
 * Content:   assets/regions.js            Quest.defineRegions([...])       one region per book chapter
 *            assets/levels/chNN.js        Quest.defineLevels("chNN", [...]) levels, boss, side quest, review cards
 * Progress:  localStorage key "ddia-quest-v1" (export/import from the map page).
 * Lessons:   const L = Quest.lesson({ id: "2.3" });  then build components with Quest.quiz(el, {...}) etc.
 *            See lessons/0203-percentiles.html for the reference lesson and PLAN.md for the authoring guide.
 */
(function () {
  "use strict";

  const KEY = "ddia-quest-v1";
  const script = document.currentScript;
  const ROOT = (script && script.dataset.root) || "";

  const XP_BY_TYPE = { level: 100, boss: 300, quest: 150, placement: 50 };
  const RANKS = [
    { name: "Intern", xp: 0, icon: "🌱" },
    { name: "Junior Engineer", xp: 600, icon: "🔧" },
    { name: "Engineer", xp: 2000, icon: "⚙️" },
    { name: "Senior Engineer", xp: 4500, icon: "🛠️" },
    { name: "Staff Engineer", xp: 8000, icon: "🧭" },
    { name: "Principal Engineer", xp: 11000, icon: "🏛️" },
    { name: "Distinguished Engineer", xp: 14000, icon: "👑" },
  ];
  const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32]; // Leitner box -> days until next review

  /* ------------------------------------------------------------------ state */
  function fresh() {
    return { v: 1, xp: 0, done: {}, streak: 0, bestStreak: 0, lastDay: null, cards: {}, freeRoam: false, history: [] };
  }
  let memState = null; // fallback when storage is unavailable
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* storage blocked */ }
    return memState || fresh();
  }
  function save(s) {
    memState = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage blocked */ }
  }
  function today(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function touchStreak(s) {
    const t = today();
    if (s.lastDay === t) return;
    s.streak = s.lastDay === today(-1) ? s.streak + 1 : 1;
    s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
    s.lastDay = t;
  }
  function rankFor(xp) {
    let i = 0;
    while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
    const cur = RANKS[i], next = RANKS[i + 1] || null;
    const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
    return { index: i, name: cur.name, icon: cur.icon, next, pct: Math.max(0, Math.min(1, pct)) };
  }
  function addXP(n, why) {
    const s = load();
    const before = rankFor(s.xp);
    s.xp += Math.round(n);
    touchStreak(s);
    s.history.push({ d: today(), xp: Math.round(n), why: why || "" });
    if (s.history.length > 400) s.history = s.history.slice(-400);
    save(s);
    const after = rankFor(s.xp);
    return { total: s.xp, rank: after, rankUp: after.index > before.index };
  }

  /* --------------------------------------------------------------- content */
  const content = { regions: [], levels: {}, byRegion: {} };
  function defineRegions(list) { content.regions = list; }
  function defineLevels(regionId, list) {
    content.byRegion[regionId] = list.map((l) => l.id);
    list.forEach((l, i) => {
      l.region = regionId;
      l.type = l.type || "level";
      l.xp = l.xp || XP_BY_TYPE[l.type] || 100;
      l.order = i;
      content.levels[l.id] = l;
    });
  }
  function loadScript(src) {
    return new Promise((resolve) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => resolve(true);
      el.onerror = () => resolve(false);
      document.head.appendChild(el);
    });
  }
  let contentPromise = null;
  function loadContent() {
    if (contentPromise) return contentPromise;
    contentPromise = (async () => {
      if (!content.regions.length) await loadScript(ROOT + "assets/regions.js");
      await Promise.all(content.regions.map((r) => (content.byRegion[r.id] ? true : loadScript(ROOT + "assets/levels/" + r.id + ".js"))));
      return content;
    })();
    return contentPromise;
  }
  function levelsOf(regionId) { return (content.byRegion[regionId] || []).map((id) => content.levels[id]); }
  function regionCleared(regionId, s) {
    s = s || load();
    const lv = levelsOf(regionId);
    if (!lv.length) return false;
    const boss = lv.find((l) => l.type === "boss");
    if (boss) return !!s.done[boss.id];
    return lv.filter((l) => l.type !== "quest").every((l) => s.done[l.id]);
  }
  function regionOpen(region, s) {
    s = s || load();
    if (s.freeRoam) return true;
    return (region.after || []).every((rid) => regionCleared(rid, s));
  }
  function levelOpen(level, s) {
    s = s || load();
    const region = content.regions.find((r) => r.id === level.region);
    if (!region || !regionOpen(region, s)) return false;
    if (level.type === "boss" && !s.freeRoam) {
      return levelsOf(level.region).filter((l) => l.type === "level").every((l) => s.done[l.id]);
    }
    return true;
  }
  /** The next level the learner should play (first open, unbuilt-or-built, not done). */
  function nextLevel(s, opts) {
    s = s || load();
    const builtOnly = opts && opts.builtOnly;
    for (const r of content.regions) {
      if (!regionOpen(r, s)) continue;
      for (const l of levelsOf(r.id)) {
        if (s.done[l.id] || !levelOpen(l, s) || l.type === "quest") continue;
        if (builtOnly && !l.file) continue;
        return l;
      }
    }
    return null;
  }
  function levelAfter(id) {
    const all = content.regions.flatMap((r) => levelsOf(r.id));
    const i = all.findIndex((l) => l.id === id);
    return i >= 0 ? all.slice(i + 1).find((l) => l.file && l.type !== "quest") || null : null;
  }
  function href(level) { return level && level.file ? ROOT + level.file : null; }

  /* ------------------------------------------------------- spaced review */
  function cardsOf(level) { return (level.review || []).map((c, i) => Object.assign({ id: level.id + "#" + i, level }, c)); }
  function seedCards(level) {
    const s = load();
    cardsOf(level).forEach((c) => { if (!s.cards[c.id]) s.cards[c.id] = { box: 1, due: today(1) }; });
    save(s);
  }
  function dueCards(opts) {
    opts = opts || {};
    const s = load(), t = today(), out = [];
    Object.values(content.levels).forEach((l) => {
      if (opts.exclude && opts.exclude === l.id) return;
      cardsOf(l).forEach((c) => {
        const st = s.cards[c.id];
        if (st && (opts.all || st.due <= t)) out.push(Object.assign({ state: st }, c));
      });
    });
    out.sort((a, b) => (a.state.due < b.state.due ? -1 : a.state.due > b.state.due ? 1 : a.state.box - b.state.box));
    return interleave(out);
  }
  function interleave(cards) {
    // round-robin across regions so review mixes topics
    const groups = {};
    cards.forEach((c) => (groups[c.level.region] = groups[c.level.region] || []).push(c));
    const keys = Object.keys(groups), out = [];
    let added = true;
    while (added) { added = false; keys.forEach((k) => { const c = groups[k].shift(); if (c) { out.push(c); added = true; } }); }
    return out;
  }
  function gradeCard(cardId, correct) {
    const s = load();
    const st = s.cards[cardId] || { box: 1, due: today() };
    st.box = correct ? Math.min(st.box + 1, BOX_DAYS.length - 1) : 1;
    st.due = today(BOX_DAYS[st.box]);
    s.cards[cardId] = st;
    save(s);
    return st;
  }

  /* -------------------------------------------------------------- helpers */
  function $(sel, root) { return typeof sel === "string" ? (root || document).querySelector(sel) : sel; }
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    (children || []).forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  }
  function shuffle(a, seed) {
    a = a.slice();
    let x = seed || (Math.random() * 1e9) | 0;
    for (let i = a.length - 1; i > 0; i--) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      const j = seed ? x % (i + 1) : Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function toast(text, kind) {
    let box = document.querySelector(".q-toasts");
    if (!box) { box = h("div", { class: "q-toasts", "aria-live": "polite" }); document.body.append(box); }
    const t = h("div", { class: "q-toast " + (kind || "") }, [text]);
    box.append(t);
    setTimeout(() => t.remove(), 2600);
  }
  function confetti(n) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = h("div", { class: "q-confetti" });
    const colors = ["#5b4bdb", "#d99a00", "#1f8a55", "#c2412d", "#0369a1", "#c026d3"];
    for (let i = 0; i < (n || 90); i++) {
      const p = h("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.6 + Math.random() * 1.8 + "s";
      p.style.animationDelay = Math.random() * 0.5 + "s";
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      box.append(p);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 4200);
  }
  function modal(nodes, opts) {
    const back = h("div", { class: "q-modal-back", role: "dialog", "aria-modal": "true" });
    const box = h("div", { class: "q-modal" }, nodes);
    back.append(box);
    const close = () => back.remove();
    back.addEventListener("click", (e) => { if (e.target === back && !(opts && opts.sticky)) close(); });
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
    document.body.append(back);
    const f = box.querySelector("button, a");
    if (f) f.focus();
    return { el: box, close };
  }
  function theme(t) {
    try { if (t) localStorage.setItem("ddia-theme", t); else t = localStorage.getItem("ddia-theme"); } catch (e) { /* ignore */ }
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    return t;
  }
  theme();

  /* --------------------------------------------------------------- lesson */
  let activeLesson = null;

  /**
   * Quest.lesson({ id }) — call once per lesson page, after the markup.
   * Renders the HUD, tracks every component, gates `.q-step.locked` sections, and renders the
   * finish button into #q-finish. Score = first-try accuracy across all graded interactions.
   */
  function lesson(opts) {
    const L = {
      id: opts.id, title: opts.title || document.title, level: null,
      graded: 0, correct: 0, combo: 0, bestCombo: 0, points: 0, units: [], finished: false,
    };
    activeLesson = L;
    const s0 = load();
    const prev = s0.done[L.id];

    // HUD
    const hud = h("div", { class: "q-hud" });
    const titleEl = h("div", { class: "q-hud-title" }, [h("small", { text: "Level " + L.id }), L.title]);
    const combo = h("span", { class: "q-chip combo", title: "Combo: correct answers in a row" }, ["🔥 ", h("b", { text: "0" })]);
    const pts = h("span", { class: "q-chip xp", title: "Points earned this level" }, ["⚡ ", h("b", { text: "0" })]);
    const themeBtn = h("button", { class: "q-btn ghost small", title: "Toggle light / dark", "aria-label": "Toggle theme", onclick: () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      theme(dark ? "light" : "dark");
    } }, ["◐"]);
    const bar = h("i");
    hud.append(
      h("div", { class: "q-hud-in" }, [h("a", { class: "q-back", href: ROOT + "index.html" + (opts.region ? "#" + opts.region : "") }, ["← Map"]), titleEl, combo, pts, themeBtn]),
      h("div", { class: "q-progress" }, [bar]),
    );
    document.body.prepend(hud);
    if (prev) toast("Replay — best so far " + "★".repeat(prev.stars || 1), "");

    function setProgress() {
      const total = L.units.length || 1;
      const done = L.units.filter((u) => u.done).length;
      bar.style.width = Math.round((done / total) * 100) + "%";
      // gate steps: a locked step opens once every unit in all earlier steps is done
      const steps = Array.from(document.querySelectorAll(".q-step"));
      let ok = true;
      steps.forEach((st) => {
        if (st.dataset.gated === "1" || st.classList.contains("locked")) {
          st.dataset.gated = "1";
          if (ok && st.classList.contains("locked")) {
            st.classList.remove("locked");
            if (L.started) st.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (!ok) st.classList.add("locked");
        }
        const mine = L.units.filter((u) => st.contains(u.el));
        if (mine.some((u) => !u.done)) ok = false;
      });
      if (finishBtn) finishBtn.disabled = L.units.some((u) => !u.done);
    }
    L.register = function (el) {
      const u = { el, done: false };
      L.units.push(u);
      setTimeout(setProgress, 0);
      return { complete() { if (!u.done) { u.done = true; L.started = true; setProgress(); } } };
    };
    /** Record a graded answer. Only first tries should be recorded. */
    L.record = function (correct, weight) {
      const w = weight == null ? 1 : weight;
      L.graded += w;
      if (correct) {
        L.correct += w;
        L.combo += 1;
        L.bestCombo = Math.max(L.bestCombo, L.combo);
        const gain = Math.round(10 * w * Math.min(L.combo, 5));
        L.points += gain;
        if (L.combo >= 3) { combo.classList.remove("hot"); void combo.offsetWidth; combo.classList.add("hot"); }
        if (L.combo === 3 || L.combo === 5 || L.combo === 10) toast("🔥 Combo x" + L.combo + "!", "xp");
      } else {
        L.combo = 0;
      }
      combo.querySelector("b").textContent = L.combo;
      pts.querySelector("b").textContent = L.points;
    };
    L.score = function () { return L.graded ? L.correct / L.graded : 1; };

    // finish button
    let finishBtn = null;
    const fin = document.getElementById("q-finish");
    if (fin) {
      finishBtn = h("button", { class: "q-btn primary", disabled: true, onclick: () => L.finish() }, ["🏁 Complete level"]);
      fin.append(h("div", { class: "q-row" }, [finishBtn, h("span", { class: "q-sidenote", text: "Finish every activity above to unlock." })]));
    }

    L.finish = async function () {
      if (L.finished) return;
      L.finished = true;
      await loadContent();
      const level = content.levels[L.id] || { id: L.id, type: opts.type || "level", xp: opts.xp || 100, title: L.title };
      const score = L.score();
      const stars = score >= 0.9 ? 3 : score >= 0.7 ? 2 : 1;
      const s = load();
      const before = s.done[L.id];
      const earned = Math.round(level.xp * (0.5 + 0.5 * score));
      const gain = before ? Math.max(0, earned - (before.xp || 0)) : earned;
      s.done[L.id] = {
        stars: Math.max(stars, (before && before.stars) || 0), best: Math.max(score, (before && before.best) || 0),
        xp: Math.max(earned, (before && before.xp) || 0), date: today(), plays: ((before && before.plays) || 0) + 1,
      };
      save(s);
      if (!before) seedCards(level);
      const res = addXP(gain, "Level " + L.id);
      const next = levelAfter(L.id);
      confetti(stars === 3 ? 140 : 80);
      const starEls = [1, 2, 3].map((i) => h("span", { class: i <= stars ? "" : "off", text: "⭐" }));
      const rb = h("i");
      modal([
        h("div", { class: "q-kicker", text: level.type === "boss" ? "Boss defeated" : "Level complete" }),
        h("h2", { text: level.title || L.title }),
        h("div", { class: "q-stars" }, starEls),
        h("div", { class: "q-metrics" }, [
          metric("Accuracy", Math.round(score * 100) + "%"),
          metric("XP gained", "+" + gain),
          metric("Best combo", "x" + L.bestCombo),
        ]),
        res.rankUp ? h("div", { class: "q-callout good" }, [h("b", { text: res.rank.icon + " Promoted to " + res.rank.name + "!" })]) : null,
        h("div", { style: "font-size:14px;font-weight:600;margin:10px 0 6px", text: res.rank.icon + " " + res.rank.name + " · " + res.total + " XP" + (res.rank.next ? " · next: " + res.rank.next.name + " at " + res.rank.next.xp : "") }),
        h("div", { class: "q-rank-bar" }, [rb]),
        stars < 3 ? h("p", { class: "q-sidenote", text: "Replay later for 3 stars. Spaced replays build long-term memory better than replaying right now." }) : null,
        h("div", { class: "q-row" }, [
          next ? h("a", { class: "q-btn primary", href: href(next) }, ["Next: " + next.id + " →"]) : null,
          h("a", { class: "q-btn", href: ROOT + "index.html#" + (level.region || "") }, ["Back to map"]),
        ]),
      ], { sticky: true });
      setTimeout(() => (rb.style.width = Math.round(res.rank.pct * 100) + "%"), 60);
      if (res.rankUp) toast(res.rank.icon + " Rank up: " + res.rank.name, "xp");
    };

    loadContent().then(() => { L.level = content.levels[L.id] || null; });
    return L;
  }
  function metric(k, v, cls) { return h("div", { class: "q-metric " + (cls || "") }, [h("div", { class: "k", text: k }), h("div", { class: "v", text: v })]); }
  function reg(el) { return activeLesson ? activeLesson.register(el) : { complete() {} }; }
  function rec(ok, w) { if (activeLesson) activeLesson.record(ok, w); }

  /* ----------------------------------------------------------- components */

  /**
   * Multiple-choice quiz, one question at a time, one attempt each.
   * questions: [{ q, options: [..], answer: index, explain, why?: [per-option text] }]
   * Write options of equal length so formatting never gives the answer away.
   */
  function quiz(el, cfg) {
    el = $(el); el.classList.add("q-quiz");
    const qs = cfg.shuffleQuestions ? shuffle(cfg.questions) : cfg.questions;
    const u = cfg.ungraded ? { complete() {} } : reg(el);
    const R = cfg.ungraded ? function () {} : rec;
    let i = 0, right = 0;
    function show() {
      el.innerHTML = "";
      if (i >= qs.length) {
        el.append(h("div", { class: "q-feedback show " + (right === qs.length ? "good" : "") }, [h("b", { text: right + " / " + qs.length + " correct. " }), right === qs.length ? "Flawless." : "Missed ones come back in Daily Review."]));
        u.complete();
        if (cfg.onDone) cfg.onDone(right, qs.length);
        return;
      }
      const q = qs[i];
      const order = cfg.shuffle === false ? q.options.map((_, k) => k) : shuffle(q.options.map((_, k) => k));
      const box = h("div", { class: "q-q" });
      if (qs.length > 1) box.append(h("div", { class: "q-q-count", text: "Question " + (i + 1) + " of " + qs.length }));
      box.append(h("div", { class: "q-q-prompt", html: q.q }));
      const opts = h("div", { class: "q-options", role: "group" });
      const fb = h("div", { class: "q-feedback", "aria-live": "polite" });
      const buttons = order.map((k, n) => h("button", { class: "q-opt", onclick: () => pick(k) }, [h("span", { class: "q-key", text: "ABCDEFG"[n] }), h("span", { html: q.options[k] })]));
      buttons.forEach((b) => opts.append(b));
      function pick(k) {
        const ok = k === q.answer;
        if (ok) right++;
        R(ok);
        buttons.forEach((b, n) => {
          b.disabled = true;
          const kk = order[n];
          if (kk === q.answer) b.classList.add("correct");
          else if (kk === k) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        const why = q.why && q.why[k] ? " " + q.why[k] : "";
        fb.innerHTML = "<b>" + (ok ? "Correct. " : "Not quite. ") + "</b>" + (ok ? "" : why + " ") + (q.explain || "");
        fb.className = "q-feedback show " + (ok ? "good" : "bad");
        const nx = h("button", { class: "q-btn primary small", onclick: () => { i++; show(); } }, [i + 1 < qs.length ? "Next question →" : "Finish"]);
        box.append(h("div", { class: "q-row" }, [nx]));
        nx.focus({ preventScroll: true });
      }
      box.append(opts, fb);
      el.append(box);
    }
    show();
    return { el };
  }

  /** Put items in the right order. items: correct order. Unlimited retries; first check is graded. */
  function order(el, cfg) {
    el = $(el);
    const u = reg(el);
    let cur = shuffle(cfg.items.map((t, i) => i));
    if (cur.every((v, i) => v === i)) cur.reverse();
    let tries = 0, solved = false;
    const list = h("ol", { class: "q-order-list" });
    const fb = h("div", { class: "q-feedback", "aria-live": "polite" });
    const check = h("button", { class: "q-btn primary", onclick: doCheck }, ["Check order"]);
    function render(marks) {
      list.innerHTML = "";
      cur.forEach((idx, pos) => {
        const li = h("li", { class: "q-order-item " + (marks ? (marks[pos] ? "correct" : "wrong") : "") }, [
          h("span", { class: "q-pos", text: pos + 1 + "." }),
          h("span", { class: "q-handle" }, [
            h("button", { "aria-label": "Move up", disabled: solved || pos === 0, onclick: () => move(pos, -1) }, ["▲"]),
            h("button", { "aria-label": "Move down", disabled: solved || pos === cur.length - 1, onclick: () => move(pos, 1) }, ["▼"]),
          ]),
          h("span", { html: cfg.items[idx] }),
        ]);
        list.append(li);
      });
    }
    function move(pos, d) { const t = cur[pos]; cur[pos] = cur[pos + d]; cur[pos + d] = t; fb.className = "q-feedback"; render(); }
    function doCheck() {
      const marks = cur.map((v, i) => v === i);
      const ok = marks.every(Boolean);
      if (tries === 0) rec(ok, cfg.weight || 1);
      tries++;
      if (ok) {
        solved = true; check.disabled = true;
        fb.innerHTML = "<b>Correct order.</b> " + (cfg.explain || "");
        fb.className = "q-feedback show good";
        u.complete();
      } else {
        fb.innerHTML = "<b>" + marks.filter(Boolean).length + " of " + marks.length + " in the right place.</b> Green ones are locked in position — move the red ones.";
        fb.className = "q-feedback show bad";
      }
      render(marks);
    }
    el.innerHTML = "";
    if (cfg.prompt) el.append(h("div", { class: "q-q-prompt", html: cfg.prompt }));
    el.append(list, h("div", { class: "q-row" }, [check]), fb);
    render();
    return { el };
  }

  /** Sort items into buckets. Tap an item, then tap a bucket. First placement of each item is graded. */
  function classify(el, cfg) {
    el = $(el);
    const u = reg(el);
    let sel = null, left = cfg.items.length;
    const fb = h("div", { class: "q-feedback", "aria-live": "polite" });
    const pool = h("div", { class: "q-pool" });
    const tried = new Set();
    const buckets = {};
    const bwrap = h("div", { class: "q-buckets" });
    cfg.buckets.forEach((b) => {
      const inner = h("div", { class: "q-pool" });
      const box = h("div", { class: "q-bucket", role: "button", tabindex: "0", onclick: () => drop(b.id), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drop(b.id); } } }, [h("h4", { html: b.label }), inner]);
      buckets[b.id] = inner;
      bwrap.append(box);
    });
    shuffle(cfg.items.map((it, i) => i)).forEach((i) => {
      const it = cfg.items[i];
      const tag = h("button", { class: "q-tag", onclick: () => { pool.querySelectorAll(".q-tag").forEach((t) => t.classList.remove("sel")); sel = { i, tag }; tag.classList.add("sel"); } }, [it.text]);
      pool.append(tag);
    });
    function drop(bid) {
      if (!sel) { fb.innerHTML = "Pick an item first, then a box."; fb.className = "q-feedback show"; return; }
      const it = cfg.items[sel.i];
      const ok = it.bucket === bid;
      if (!tried.has(sel.i)) { tried.add(sel.i); rec(ok); }
      if (ok) {
        sel.tag.classList.remove("sel"); sel.tag.classList.add("correct"); sel.tag.disabled = true;
        buckets[bid].append(sel.tag);
        fb.innerHTML = "<b>Yes.</b> " + (it.explain || "");
        fb.className = "q-feedback show good";
        left--;
        if (!left) { fb.innerHTML = "<b>All sorted.</b> " + (cfg.explain || ""); u.complete(); }
      } else {
        const t = sel.tag; t.classList.add("wrong"); setTimeout(() => t.classList.remove("wrong"), 500);
        fb.innerHTML = "<b>Not that one.</b> " + (it.hint || "Think about it again and try another box.");
        fb.className = "q-feedback show bad";
      }
      sel = null;
    }
    el.innerHTML = "";
    if (cfg.prompt) el.append(h("div", { class: "q-q-prompt", html: cfg.prompt }));
    el.append(pool, bwrap, fb);
    return { el };
  }

  /** Free recall: learner writes an answer, reveals the model answer, then grades themselves. */
  function recall(el, cfg) {
    el = $(el);
    const u = reg(el);
    const box = h("div", { class: "q-recall" });
    const ta = h("textarea", { placeholder: cfg.placeholder || "Write your answer from memory, before looking…", "aria-label": "Your answer" });
    const ans = h("div", { class: "q-recall-a", html: "<b>Model answer.</b> " + cfg.answer });
    const grade = h("div", { class: "q-row", style: "display:none" }, [
      h("span", { class: "q-sidenote", style: "margin:0;border:0;padding:0", text: "How did you do?" }),
      gbtn("✅ Got it", 1), gbtn("🤏 Partly", 0.5), gbtn("❌ Missed it", 0),
    ]);
    function gbtn(t, v) {
      return h("button", { class: "q-btn small", onclick: () => {
        rec(v >= 1, 1); if (v === 0.5 && activeLesson) { activeLesson.correct += 0.5; }
        grade.innerHTML = ""; grade.append(h("span", { class: "q-sidenote", style: "margin:0", text: v >= 1 ? "Nice — retrieval like that is what builds long-term memory." : "That's fine. Struggling to recall is what makes it stick next time." }));
        u.complete();
      } }, [t]);
    }
    const reveal = h("button", { class: "q-btn primary small", onclick: () => { box.classList.add("open"); reveal.remove(); grade.style.display = "flex"; } }, ["Reveal answer"]);
    box.append(h("div", { class: "q-q-prompt", html: cfg.prompt }), ta, h("div", { class: "q-row" }, [reveal]), ans, grade);
    el.innerHTML = ""; el.append(box);
    return { el };
  }

  /** Back-of-the-envelope estimate. Correct if within `factor` (default 2x) of the answer. Two graded tries. */
  function estimate(el, cfg) {
    el = $(el); el.classList.add("q-estimate");
    const u = reg(el);
    const f = cfg.factor || 2;
    let tries = 0;
    const input = h("input", { type: "text", inputmode: "decimal", placeholder: cfg.placeholder || "your estimate", "aria-label": "Your estimate" });
    const fb = h("div", { class: "q-feedback", "aria-live": "polite" });
    const btn = h("button", { class: "q-btn primary", onclick: go }, ["Check"]);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    function parse(v) {
      v = String(v).trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "");
      const m = v.match(/^([0-9]*\.?[0-9]+)(e[+-]?\d+)?([kmbt]?)$/);
      if (!m) return NaN;
      return parseFloat(m[1] + (m[2] || "")) * ({ "": 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[3]]);
    }
    function go() {
      const v = parse(input.value);
      if (!isFinite(v) || v <= 0) { fb.innerHTML = "Enter a positive number (you can write 2k, 3.5m, 1e6)."; fb.className = "q-feedback show"; return; }
      const r = v / cfg.answer;
      const ok = r <= f && r >= 1 / f;
      tries++;
      if (tries === 1) rec(ok);
      if (ok || tries >= 2) {
        btn.disabled = true; input.disabled = true;
        fb.innerHTML = "<b>" + (ok ? "Within range! " : "Off by " + (r > 1 ? r : 1 / r).toFixed(1) + "×. ") + "</b>Reference answer: <b>" + fmt(cfg.answer) + (cfg.unit ? " " + cfg.unit : "") + "</b>. " + (cfg.explain || "");
        fb.className = "q-feedback show " + (ok ? "good" : "bad");
        u.complete();
      } else {
        fb.innerHTML = "<b>Too " + (r > 1 ? "high" : "low") + "</b> (off by more than " + f + "×). One more try — " + (cfg.hint || "redo the arithmetic step by step.");
        fb.className = "q-feedback show bad";
      }
    }
    el.innerHTML = "";
    el.append(h("div", { class: "q-q-prompt", html: cfg.prompt }), h("div", { class: "q-row" }, [input, cfg.unit ? h("span", { text: cfg.unit }) : null, btn]), fb);
    return { el };
  }
  function fmt(n) {
    const a = Math.abs(n);
    if (a >= 1e12) return +(n / 1e12).toPrecision(3) + " trillion";
    if (a >= 1e9) return +(n / 1e9).toPrecision(3) + " billion";
    if (a >= 1e6) return +(n / 1e6).toPrecision(3) + " million";
    if (a >= 1e4) return Math.round(n).toLocaleString("en-US");
    return +n.toPrecision(4) + "";
  }

  /**
   * Branching incident or boss fight. Each step: { situation, tag?, choices: [{ text, correct, feedback }] }.
   * Wrong choices cost HP (interviewer confidence or service health) and the learner retries that step.
   */
  function scenario(el, cfg) {
    el = $(el);
    const u = reg(el);
    const maxHp = cfg.hp || 100;
    let hp = maxHp, i = 0;
    const hpBar = h("i", { style: "width:100%" });
    const hpLabel = h("span", { text: maxHp + "" });
    const body = h("div");
    function render() {
      body.innerHTML = "";
      if (i >= cfg.steps.length) {
        const won = hp > 0;
        body.append(h("div", { class: "q-feedback show " + (won ? "good" : "bad"), html: "<b>" + (won ? (cfg.winTitle || "Victory!") : (cfg.loseTitle || "Survived — barely.")) + "</b> " + (won ? cfg.win || "" : cfg.lose || cfg.win || "") }));
        u.complete();
        if (cfg.onDone) cfg.onDone(hp, maxHp);
        return;
      }
      const st = cfg.steps[i];
      let first = true;
      body.append(h("div", { class: "q-q-count", text: (cfg.stepLabel || "Round") + " " + (i + 1) + " of " + cfg.steps.length }));
      body.append(h("div", { class: "q-scn-situation" }, [h("span", { class: "q-scn-tag", text: st.tag || cfg.tag || "Situation" }), h("div", { html: st.situation })]));
      const opts = h("div", { class: "q-options" });
      const fb = h("div", { class: "q-feedback", "aria-live": "polite" });
      const order = shuffle(st.choices.map((_, k) => k));
      const btns = order.map((k, n) => h("button", { class: "q-opt", onclick: () => choose(k, btns[n]) }, [h("span", { class: "q-key", text: "ABCDEF"[n] }), h("span", { html: st.choices[k].text })]));
      btns.forEach((b) => opts.append(b));
      function choose(k, b) {
        const c = st.choices[k];
        if (first) { rec(!!c.correct); first = false; }
        if (c.correct) {
          btns.forEach((x) => (x.disabled = true));
          b.classList.add("correct");
          fb.innerHTML = "<b>Good call.</b> " + (c.feedback || "");
          fb.className = "q-feedback show good";
          body.append(h("div", { class: "q-row" }, [h("button", { class: "q-btn primary small", onclick: () => { i++; render(); } }, [i + 1 < cfg.steps.length ? "Continue →" : "See result"])]));
        } else {
          b.disabled = true; b.classList.add("wrong");
          hp = Math.max(0, hp - (c.damage || Math.round(maxHp / 5)));
          hpBar.style.width = (hp / maxHp) * 100 + "%"; hpLabel.textContent = hp;
          fb.innerHTML = "<b>" + (cfg.damageText || "Ouch.") + "</b> " + (c.feedback || "") + " Try another option.";
          fb.className = "q-feedback show bad";
        }
      }
      body.append(opts, fb);
    }
    el.innerHTML = "";
    if (cfg.title) el.append(h("h3", { style: "margin-top:0", text: cfg.title }));
    if (cfg.hpLabel !== false) el.append(h("div", { class: "q-hp" }, [h("span", { text: (cfg.hpLabel || "❤️ Health") }), h("div", { class: "q-hp-bar" }, [hpBar]), hpLabel]));
    el.append(body);
    render();
    return { el };
  }

  /** Warm-up "Recall Run": up to `count` due review cards from earlier levels (spacing + interleaving). */
  function recallRun(el, cfg) {
    el = $(el);
    cfg = cfg || {};
    const u = reg(el);
    el.innerHTML = "<p class='q-sidenote'>Loading your review deck…</p>";
    loadContent().then(() => {
      const cards = dueCards({ exclude: activeLesson && activeLesson.id }).slice(0, cfg.count || 3);
      el.innerHTML = "";
      if (!cards.length) {
        el.append(h("p", { class: "q-sidenote", text: "No review cards due yet — they appear here after you clear levels. Recalling an old idea before learning a new one is what makes it stick." }));
        u.complete();
        return;
      }
      el.append(h("p", { class: "q-sidenote", text: "Warm-up: " + cards.length + " card" + (cards.length > 1 ? "s" : "") + " from earlier levels. Answer from memory." }));
      const holder = h("div");
      el.append(holder);
      // review answers update the Leitner boxes and the combo, but not this level's score
      let i = 0;
      (function next() {
        if (i >= cards.length) { holder.innerHTML = ""; holder.append(h("div", { class: "q-feedback show good", html: "<b>Warm-up done.</b> Cards you missed will come back sooner." })); u.complete(); return; }
        const c = cards[i];
        holder.innerHTML = "";
        const box = h("div");
        holder.append(h("div", { class: "q-q-count", text: "From level " + c.level.id + " · " + (c.level.title || "") }), box);
        quiz(box, { ungraded: true, questions: [{ q: c.q, options: c.options, answer: c.answer, explain: c.explain }], onDone: (r) => { gradeCard(c.id, r === 1); if (activeLesson) activeLesson.record(r === 1, 0); i++; setTimeout(next, 900); } });
      })();
    });
    return { el };
  }

  /* ----------------------------------------------------- export / import */
  function exportState() { return JSON.stringify(load(), null, 2); }
  function importState(json) { const s = Object.assign(fresh(), JSON.parse(json)); save(s); return s; }
  function reset() { save(fresh()); }
  function setFreeRoam(on) { const s = load(); s.freeRoam = !!on; save(s); }

  window.Quest = {
    ROOT, RANKS, XP_BY_TYPE,
    state: load, save, addXP, rankFor, today,
    defineRegions, defineLevels, loadContent, content, levelsOf, regionCleared, regionOpen, levelOpen, nextLevel, levelAfter, href,
    dueCards, gradeCard, seedCards, cardsOf,
    lesson, quiz, order, classify, recall, estimate, scenario, recallRun,
    toast, confetti, modal, h, shuffle, fmt, theme, metric,
    exportState, importState, reset, setFreeRoam,
  };
})();
