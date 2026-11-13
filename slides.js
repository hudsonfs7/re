(() => {
  const { CONFIG, ROLES, QUESTIONS, uid, store, voteUrl, createBus } = window.RE;
  const FX = window.FX;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const stage = $("#stage");
  const N = QUESTIONS.length;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- escala 1920x1080 ---------- */
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  addEventListener("resize", fit); fit();

  /* ---------- conteúdo dinâmico ---------- */
  const people = ["Aléssio Cripa", "Brenno Oliveira", "Elaine Pâmela", "Hudson Souza", "Igor Souza", "Jhuly Emanuelly", "Mateus Sena"];
  $("#coverNames").innerHTML = people.map((p, i) => `<span style="--i:${i}">${p}</span>`).join("");

  const CHAPTERS = [
    { id: "intro", label: "Abertura" },
    { id: "a", label: "A · Cabimento" },
    { id: "b", label: "B · Filtros" },
    { id: "c", label: "C · Tramitação & casos" },
    { id: "quiz", label: "Quiz ao vivo" },
    { id: "end", label: "Encerramento" },
  ];
  $("#agenda").innerHTML = CHAPTERS.map((c, i) => {
    const r = ROLES[c.id];
    const title = { intro: "Boas-vindas", a: "O que é e quando cabe", b: "Os filtros do RE", c: "Tramitação, efeitos e casos", quiz: "Verdadeiro ou falso, ao vivo", end: "Conclusão" }[c.id];
    return `<div class="ag" style="transition-delay:${0.15 + i * 0.12}s"><div class="play">▶</div><div class="t">${i === 0 ? "Abertura" : i === 4 ? "Quiz" : i === 5 ? "Final" : "Capítulo " + c.id.toUpperCase()}</div><h4>${title}</h4>${c.id === "end" ? "" : `<div class="who">com ${r.name}</div>`}</div>`;
  }).join("");

  // bancada do STF (11 ministros)
  const bench = $("#bench");
  for (let i = 0; i < 11; i++) {
    const ang = Math.PI - (i / 10) * Math.PI;
    const s = document.createElement("div");
    s.className = "seat";
    s.style.setProperty("--i", i);
    s.style.left = 380 + Math.cos(ang) * 320 + "px";
    s.style.top = 360 - Math.sin(ang) * 300 + "px";
    bench.appendChild(s);
  }

  // slides do quiz
  const url = voteUrl();
  $$(".slide.quiz").forEach((sl) => {
    const q = +sl.dataset.q, Q = QUESTIONS[q];
    sl.innerHTML = `
      <div class="qleft">
        <div class="qn">Pergunta ${q + 1} <span class="of">de ${N}</span></div>
        <div class="qt">${Q.t}</div>
        <div class="qmeta">
          <div class="timer"><svg width="110" height="110"><circle cx="55" cy="55" r="48" stroke="#26345e" stroke-width="8" fill="none"/><circle class="tc" cx="55" cy="55" r="48" stroke="#e3b54a" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="0"/></svg><div class="tnum">${CONFIG.QUESTION_TIME}</div></div>
          <div><b class="nv">0</b> <span class="nvl">votos</span></div>
          <div class="tstate"></div>
        </div>
        <button class="start-btn" type="button">Iniciar votação <span>▶</span></button>
        <button class="reveal-btn" type="button">Ver resposta <span>▶</span></button>
        <div class="hit"><b class="hitp">0%</b><span>da turma acertou</span></div>
      </div>
      <div class="bars">
        <div class="bar isV ${Q.a ? "" : "wrong"}"><div class="pct">0%</div><div class="cnt">0</div><div class="col"></div><div class="lab">VERDADEIRO</div></div>
        <div class="bar isF ${Q.a ? "wrong" : ""}"><div class="pct">0%</div><div class="cnt">0</div><div class="col"></div><div class="lab">FALSO</div></div>
      </div>
      <div class="miniqr"><div class="q"></div><span>${url}</span></div>
      <div class="stamp ${Q.a ? "isV" : "isF"}">${Q.a ? "VERDADEIRO" : "FALSO"}</div>
      <div class="just"><div class="ans ${Q.a ? "isV" : "isF"}">${Q.a ? "VERDADEIRO" : "FALSO"}</div><div><p>${Q.j}</p><small>${Q.base}</small></div><div class="rate"><b class="rt">0%</b>acertaram</div></div>
      <div class="rgbadge">2/3 errou: repercussão geral do erro reconhecida 😅</div>`;
  });

  // texto animado palavra por palavra / letra por letra
  $$(".title, .hook, .recap-list li, .takeaways p, .qt").forEach((el) => FX.splitWords(el, "w"));
  $$(".split-c").forEach((el) => FX.splitWords(el, "c"));

  // botão "Iniciar votação" (libera a pergunta nos celulares e começa os 30 s)
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".start-btn");
    if (!b) return;
    e.stopPropagation();
    startVoting();
  }, true);

  // botão "Ver resposta" (para o tempo e revela)
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".reveal-btn");
    if (!b) return;
    e.stopPropagation();
    reveal();
  }, true);

  // QR codes
  function qr(el, size) {
    if (!window.QRCode) { el.textContent = "QR"; return; }
    new QRCode(el, { text: url, width: size, height: size, colorDark: "#0a0f1e", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
  }
  qr($("#qrBig"), 560);
  $("#urlBig").textContent = url.replace(/^https?:\/\//, "");
  $$(".miniqr .q").forEach((el) => qr(el, 92));

  // gotas do funil: 12 barradas em filtros diferentes, 1 chega ao STF
  (() => {
    const box = $("#rainbox"); if (!box) return;
    const layers = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 2];
    layers.forEach((k, i) => {
      const d = document.createElement("i");
      d.className = "rd";
      d.style.setProperty("--x", (Math.random() * 900 - 450).toFixed(0) + "px");
      d.style.setProperty("--stop", k * 110 + 27 + "px");
      d.style.setProperty("--side", Math.random() < 0.5 ? -1 : 1);
      d.style.setProperty("--d", (-i * 0.23).toFixed(2) + "s");
      box.appendChild(d);
    });
    const w = document.createElement("i");
    w.className = "rd win"; w.style.setProperty("--x", "120px"); w.style.setProperty("--d", "0s");
    box.appendChild(w);
  })();

  /* ---------- navegação ---------- */
  const slides = $$(".slide");
  let cur = -1, lastRole = null;

  const chEl = $("#chapters");
  CHAPTERS.forEach((c) => {
    const count = slides.filter((s) => s.dataset.ch === c.id).length;
    const d = document.createElement("div");
    d.className = "chp"; d.style.flex = count; d.dataset.ch = c.id;
    d.innerHTML = `<div class="fill"></div><div class="lbl">${c.label}</div>`;
    d.onclick = (e) => { e.stopPropagation(); go(slides.findIndex((s) => s.dataset.ch === c.id)); };
    chEl.appendChild(d);
  });

  function updateHud() {
    const s = slides[cur];
    $("#slideN").textContent = `${cur + 1} / ${slides.length}`;
    $$(".chp").forEach((c) => {
      const list = slides.map((x, i) => [x, i]).filter(([x]) => x.dataset.ch === c.dataset.ch).map(([, i]) => i);
      const done = list.filter((i) => i <= cur).length;
      c.querySelector(".fill").style.width = (done / list.length) * 100 + "%";
      c.classList.toggle("cur", c.dataset.ch === s.dataset.ch);
    });
    const r = ROLES[s.dataset.role];
    $("#notesSpeaker").textContent = r ? `${r.name} · ${r.label}` : "";
    $("#notesText").textContent = s.dataset.notes || "";
  }

  let l3timer, l3out;
  function lowerThird(role) {
    const r = ROLES[role]; if (!r) return;
    $("#l3name").textContent = r.name; $("#l3role").textContent = r.label;
    const el = $("#lower3");
    clearTimeout(l3timer); clearTimeout(l3out);
    el.classList.remove("out"); el.classList.add("show");
    l3timer = setTimeout(() => {
      el.classList.add("out");
      l3out = setTimeout(() => el.classList.remove("show", "out"), 1300);
    }, 9000);
  }

  let recapTimer = null;
  function go(i, showAll = false) {
    if (i < 0 || i >= slides.length || i === cur) return;
    const dir = i > cur ? 1 : -1;
    stage.style.setProperty("--dir", dir);
    const prev = slides[cur];
    if (prev) {
      prev.classList.remove("active"); prev.classList.add("out");
      setTimeout(() => prev.classList.remove("out"), 800);
      onLeave(prev);
    }
    cur = i;
    const s = slides[cur];
    $$(".f", s).forEach((f) => f.classList.toggle("on", showAll));
    $$(".stairs, .funnel", s).forEach((x) => x.classList.remove("go", "rain"));
    $$(".seat", s).forEach((x) => x.classList.remove("no"));
    if (s.dataset.wipe != null && dir > 0) FX.wipe();
    FX.kick(dir);
    FX.sfx("whoosh");
    // reinicia animações CSS do slide
    if (s.dataset.lobby != null) crowdStart();
    s.classList.remove("active"); void s.offsetWidth; s.classList.add("active");
    if (showAll) $$(".f", s).forEach((f) => onFragment(f, true));
    if (s.dataset.role !== lastRole) { lastRole = s.dataset.role; setTimeout(() => lowerThird(lastRole), 700); }
    try { history.replaceState(null, "", location.search + "#" + (cur + 1)); } catch (e) { }
    updateHud();
    // contagem regressiva do "recapitulando"
    clearInterval(recapTimer);
    const rb = $(".ring10 b", s);
    if (rb) { let n = 10; rb.textContent = n; recapTimer = setInterval(() => { n = Math.max(0, n - 1); rb.textContent = n; if (!n) clearInterval(recapTimer); }, 1000); }
    onEnter(s);
  }
  function next() {
    const s = slides[cur];
    const f = $$(".f:not(.on)", s)[0];
    if (f) { f.classList.add("on"); onFragment(f); return; }
    if (s.dataset.q != null && curQ != null && phase === "ready") { startVoting(); return; } // 1º avanço: libera a votação
    if (s.dataset.q != null && curQ != null && !QZ.revealed[curQ]) { reveal(); return; } // avançar numa pergunta sem resposta revela a resposta
    go(cur + 1);
  }
  function prev() { go(cur - 1, true); }

  // efeitos disparados quando um item aparece
  function onFragment(f, quiet = false) {
    const fx = f.dataset.fx;
    if (!quiet) FX.sfx("pop");
    const [x, y] = FX.center(f);
    if (fx === "burst") { if (!quiet) { FX.sparks(x, y, "#f5d68a", 60); FX.kick(1); } }
    else if (fx === "spark") { if (!quiet) setTimeout(() => { const [a, b] = FX.center(f); FX.sparks(a, b, "#f5d68a", 34); }, 450); }
    else if (fx === "climb") {
      const st = f.closest(".stairs"); st.classList.add("go");
      if (!quiet) setTimeout(() => { const [a, b] = FX.center(f); FX.sparks(a, b, "#f5d68a", 70); FX.sfx("ding"); }, 2300);
    }
    else if (fx === "rain") f.closest(".funnel").classList.add("rain");
    else if (fx === "count") { const el = $("[data-count]", f); if (el) quiet ? (el.textContent = el.dataset.count) : FX.countUp(el, +el.dataset.count, 1300); }
    else if (fx === "stamp") {
      if (!quiet) setTimeout(() => { shake(); FX.sfx("thud"); const [a, b] = FX.center($(".stamp-s", f)); FX.sparks(a, b, "#ff5a6a", 50); FX.kick(1, "red"); }, 420);
    }
    else if (fx === "bench") {
      $$(".seat").forEach((s, k) => k < 8 && setTimeout(() => { s.classList.add("no"); if (!quiet) { const [a, b] = FX.center(s); FX.sparks(a, b, "#ff5a6a", 10); FX.sfx("tick"); } }, quiet ? 0 : k * 140));
      const n8 = $(".n8", f); quiet ? (n8.textContent = 8) : FX.countUp(n8, 8, 1100);
    }
    else if (fx === "flip") { if (!quiet) setTimeout(() => { const [a, b] = FX.center(f); FX.sparks(a, b, "#f5d68a", 40); }, 450); }
    else if (fx === "party") { if (!quiet) { FX.rain(260); FX.confetti(innerWidth / 2, innerHeight * 0.55, 160, 1.3); FX.sfx("fanfare"); } }
  }
  function shake() { const vp = $("#viewport"); vp.classList.remove("shake"); void vp.offsetWidth; vp.classList.add("shake"); }

  function toggleSound() { const on = FX.toggleSound(); $("#snd").textContent = on ? "🔊" : "🔇"; }
  $("#snd").addEventListener("click", (e) => { e.stopPropagation(); toggleSound(); });

  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (["ArrowRight", "PageDown", " ", "Enter", "ArrowDown"].includes(k)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp", "ArrowUp", "Backspace"].includes(k)) { e.preventDefault(); prev(); }
    else if (k === "f" || k === "F") { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen(); }
    else if (k === "n" || k === "N") $("#notes").classList.toggle("show");
    else if (k === "h" || k === "H" || k === "?") $("#help").classList.toggle("show");
    else if (k === "s" || k === "S") toggleSound();
    else if (k === "r" || k === "R") reveal();
    else if (k === "t" || k === "T") toggleTimer();
    else if (k === "1") manualVote("V");
    else if (k === "2") manualVote("F");
    else if (k === "Z" && e.shiftKey) resetAll();
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
  });
  $("#viewport").addEventListener("click", (e) => { if (!e.target.closest("#hud")) next(); });
  let tx = null;
  addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener("touchend", (e) => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 60) (d < 0 ? next : prev)(); tx = null; });
  // esconde o cursor parado (projetor)
  let idleT;
  addEventListener("mousemove", () => { document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add("idle"), 2500); });

  /* ================= QUIZ AO VIVO ================= */
  const KEY = "re_pres_" + CONFIG.ROOM;
  let QZ = store.get(KEY) || null;
  if (!QZ || !QZ.session) QZ = { session: uid(6), votes: {}, opened: {}, revealed: {} };
  const save = () => store.set(KEY, QZ);
  save();

  const online = {};
  let phase = "idle", curQ = null, tick = null, paused = false, lastSec = null;

  const bus = createBus({
    subs: ["vote", "hello"],
    onMessage(kind, m) {
      if (m.session && m.session !== QZ.session && kind === "vote") return;
      const isNew = m.id && !online[m.id];
      if (m.id) online[m.id] = Date.now();
      if (m.id) crowdJoined(m.id, m.nick);
      if (kind === "vote") onVote(m);
      renderOnline();
    },
    onStatus(st) {
      const c = $("#conn");
      c.className = st.mqtt ? "ok" : st.ntfy ? "warn" : "";
      c.title = `votação: ${st.mqtt} servidor(es) MQTT${st.ntfy ? " + ntfy" : ""}`;
      if ((st.mqtt || st.ntfy) && !bus._sentOnce) { bus._sentOnce = true; publishState(true); }
    },
  });

  /* ---------- nomes flutuando no lobby (emoji jurídico + cor própria) ---------- */
  const CROWD_EMOJI = ["⚖️", "🏛️", "📜", "🔨", "👨‍⚖️", "👩‍⚖️", "📚", "🖋️", "🗂️", "📘", "🔖", "🧾"];
  const CROWD_COLORS = ["#e3b54a", "#35d399", "#5b8cff", "#ff5a6a", "#c084fc", "#38bdf8", "#fb923c", "#f472b6", "#a3e635", "#2dd4bf", "#818cf8", "#e879f9"];
  const crowd = {};
  let crowdN = 0;
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  function crowdFit() {
    const box = $("#crowd"), n = Object.keys(crowd).length;
    if (box) { box.className = "crowd " + (n <= 18 ? "s0" : n <= 30 ? "s1" : n <= 46 ? "s2" : "s3"); Object.values(crowd).forEach((c) => { c.w = 0; }); }
  }
  function crowdMeasure(c) { c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; }
  let crowdRaf = 0, crowdLast = 0;
  function crowdTick(t) {
    const s = slides[cur];
    if (!s || s.dataset.lobby == null) { crowdRaf = 0; return; }
    const dt = Math.min(0.05, (t - (crowdLast || t)) / 1000); crowdLast = t;
    const W = 1920, H = 1080, L = Object.values(crowd);
    L.forEach((c) => {
      if (!c.w) crowdMeasure(c);
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < 0) { c.x = 0; c.vx = Math.abs(c.vx); }
      if (c.x + c.w > W) { c.x = W - c.w; c.vx = -Math.abs(c.vx); }
      if (c.y < 0) { c.y = 0; c.vy = Math.abs(c.vy); }
      if (c.y + c.h > H) { c.y = H - c.h; c.vy = -Math.abs(c.vy); }
    });
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const p = L[i], q = L[j];
      const ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) {
        const dir = p.x + p.w / 2 < q.x + q.w / 2 ? -1 : 1;
        p.x += dir * ox / 2; q.x -= dir * ox / 2;
        const t1 = p.vx; p.vx = q.vx; q.vx = t1;
        if (Math.sign(p.vx) !== dir) p.vx = dir * Math.abs(p.vx);
        if (Math.sign(q.vx) !== -dir) q.vx = -dir * Math.abs(q.vx);
      } else {
        const dir = p.y + p.h / 2 < q.y + q.h / 2 ? -1 : 1;
        p.y += dir * oy / 2; q.y -= dir * oy / 2;
        const t1 = p.vy; p.vy = q.vy; q.vy = t1;
        if (Math.sign(p.vy) !== dir) p.vy = dir * Math.abs(p.vy);
        if (Math.sign(q.vy) !== -dir) q.vy = -dir * Math.abs(q.vy);
      }
    }
    L.forEach((c) => { c.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px)`; });
    crowdRaf = requestAnimationFrame(crowdTick);
  }
  function crowdStart() {
    if (crowdRaf) return;
    crowdLast = 0;
    crowdRaf = requestAnimationFrame(crowdTick);
  }
  function crowdTag(id, nick) {
    const box = $("#crowd");
    if (!box || !id) return false;
    nick = String(nick || "Novo ministro").slice(0, 24);
    let c = crowd[id], isNew = false;
    if (!c) {
      isNew = true;
      const k = crowdN++, col = CROWD_COLORS[k % CROWD_COLORS.length];
      const el = document.createElement("div");
      el.className = "ctag";
      const st = el.style;
      st.setProperty("--c", col);
      st.setProperty("--cbg", rgba(col, 0.16));
      st.setProperty("--cglow", rgba(col, 0.45));
      el.innerHTML = `<div class="cin"><i>${CROWD_EMOJI[(k * 5) % CROWD_EMOJI.length]}</i><span></span></div>`;
      box.appendChild(el);
      const ang = Math.random() * Math.PI * 2, sp = 220 + Math.random() * 160;
      c = crowd[id] = { el, nick: "", col, x: 100 + Math.random() * 1500, y: 60 + Math.random() * 900, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, w: 0, h: 0 };
      if (Math.abs(c.vx) < 90) c.vx = 90 * (c.vx < 0 ? -1 : 1);
      if (Math.abs(c.vy) < 90) c.vy = 90 * (c.vy < 0 ? -1 : 1);
      el.style.transform = `translate(${c.x}px,${c.y}px)`;
      crowdFit();
    }
    if (c.nick !== nick) { c.nick = nick; c.el.querySelector("span").textContent = nick; crowdMeasure(c); }
    return isNew;
  }
  function crowdJoined(id, nick) {
    const isNew = crowdTag(id, nick);
    const s = slides[cur];
    if (s && s.dataset.lobby != null) crowdStart();
    if (isNew && s && s.dataset.lobby != null) {
      FX.sfx("pop");
      setTimeout(() => {
        const r = crowd[id] && crowd[id].el.getBoundingClientRect();
        if (r && r.width) FX.sparks(r.left + r.width / 2, r.top + r.height / 2, crowd[id].col, 14);
      }, 350);
    }
  }
  // quem sumiu há mais de 4 min (celular desligado) sai do céu de nomes
  setInterval(() => {
    const now = Date.now();
    Object.keys(crowd).forEach((id) => { if (now - (online[id] || 0) > 240000) { crowd[id].el.remove(); delete crowd[id]; } });
    crowdFit();
  }, 20000);

  function onlineCount() {
    const now = Date.now();
    return Object.values(online).filter((t) => now - t < 90000).length;
  }
  function renderOnline() {
    const el = $("#onlineN"), n = onlineCount();
    if (+el.textContent !== n) { el.textContent = n; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    dirty = true;
  }

  function counts(q) {
    const v = QZ.votes[q] || {};
    let V = 0, F = 0;
    Object.values(v).forEach((x) => (x.a === "V" ? V++ : F++));
    return { V, F, n: V + F };
  }

  function voteFx(a) {
    const sl = $(`.slide.quiz[data-q="${curQ}"]`);
    const bar = $(a === "V" ? ".bar.isV" : ".bar.isF", sl);
    const col = $(".col", bar);
    // ponto voando do QR até a barra
    const from = $(".miniqr .q", sl).getBoundingClientRect();
    const to = col.getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "flydot";
    const color = a === "V" ? "#35d399" : "#ff5a6a";
    d.style.background = color; d.style.boxShadow = `0 0 16px ${color}`;
    document.body.appendChild(d);
    const x0 = from.left + from.width / 2, y0 = from.top, x1 = to.left + to.width / 2, y1 = to.top;
    d.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 220}px) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${x1}px,${y1}px) scale(.8)`, opacity: 1 },
    ], { duration: 700, easing: "cubic-bezier(.4,0,.6,1)" }).onfinish = () => {
      d.remove();
      col.classList.remove("bump"); void col.offsetWidth; col.classList.add("bump");
      const c = document.createElement("div"); c.className = "chip"; c.textContent = "+1";
      bar.appendChild(c); setTimeout(() => c.remove(), 1000);
      FX.sparks(x1, y1, color, 12);
    };
    FX.sfx("pop");
  }

  function onVote(m) {
    const q = m.q;
    if (q !== curQ || phase !== "open" || QZ.revealed[q]) return;
    if (m.a !== "V" && m.a !== "F") return;
    QZ.votes[q] = QZ.votes[q] || {};
    const prevV = QZ.votes[q][m.id];
    if (prevV && prevV.a === m.a) return;
    QZ.votes[q][m.id] = { a: m.a, at: Date.now(), nick: String(m.nick || "").slice(0, 28) };
    save(); renderQuiz(); dirty = true; voteFx(m.a);
  }
  function manualVote(a) {
    if (curQ == null || QZ.revealed[curQ]) return;
    QZ.votes[curQ] = QZ.votes[curQ] || {};
    QZ.votes[curQ]["m_" + uid(6)] = { a, at: Date.now(), manual: true };
    save(); renderQuiz(); dirty = true; voteFx(a);
  }

  function renderQuiz() {
    if (curQ == null) return;
    const sl = $(`.slide.quiz[data-q="${curQ}"]`);
    const { V, F, n } = counts(curQ);
    const pv = n ? Math.round((V / n) * 100) : 0, pf = n ? 100 - pv : 0;
    const bv = $(".bar.isV", sl), bf = $(".bar.isF", sl);
    $(".pct", bv).textContent = pv + "%"; $(".cnt", bv).textContent = V + (V === 1 ? " voto" : " votos");
    $(".pct", bf).textContent = pf + "%"; $(".cnt", bf).textContent = F + (F === 1 ? " voto" : " votos");
    $(".col", bv).style.height = (n ? (V / n) * 380 : 0) + 12 + "px";
    $(".col", bf).style.height = (n ? (F / n) * 380 : 0) + 12 + "px";
    $(".nv", sl).textContent = n;
    $(".nvl", sl).textContent = n === 1 ? "voto" : "votos";
    const correct = QUESTIONS[curQ].a ? V : F;
    const rate = (n ? Math.round((correct / n) * 100) : 0) + "%";
    $(".rt", sl).textContent = rate;
    $(".hitp", sl).textContent = n ? rate : "–";
    $(".rgbadge", sl).classList.toggle("show", n >= 3 && (n - correct) / n >= 2 / 3);
  }

  function setTimerUI() {
    if (curQ == null) return;
    const sl = $(`.slide.quiz[data-q="${curQ}"]`);
    const total = CONFIG.QUESTION_TIME * 1000;
    const left = Math.max(0, total - (QZ.elapsed?.[curQ] || 0));
    const sec = Math.ceil(left / 1000);
    $(".tnum", sl).textContent = sec;
    $(".tc", sl).style.strokeDashoffset = 301.6 * (1 - left / total);
    $(".tstate", sl).textContent = QZ.revealed[curQ] ? "" : phase === "ready" ? "👀 leia a pergunta · celulares aguardando" : phase === "closed" ? "⛔ votação encerrada" : paused ? "⏸ pausado" : "";
    const urgent = phase === "open" && !paused && sec <= 5 && sec > 0;
    sl.classList.toggle("urgent", urgent);
    if (urgent && sec !== lastSec) FX.sfx("tick");
    lastSec = sec;
    return left;
  }
  function startTimer() {
    clearInterval(tick);
    QZ.elapsed = QZ.elapsed || {};
    let last = Date.now();
    tick = setInterval(() => {
      const now = Date.now();
      if (!paused && phase === "open") {
        QZ.elapsed[curQ] = (QZ.elapsed[curQ] || 0) + (now - last);
        if (setTimerUI() <= 0) { phase = "closed"; save(); setTimerUI(); FX.sfx("thud"); publishState(true); } // acabou o tempo: só encerra a votação (resposta só em "Ver resposta" ou ao avançar)
      }
      last = now;
    }, 200);
  }
  function startVoting() {
    if (curQ == null || phase !== "ready") return;
    const sl = $(`.slide.quiz[data-q="${curQ}"]`);
    QZ.started = QZ.started || {}; QZ.started[curQ] = true;
    QZ.opened[curQ] = Date.now(); QZ.elapsed = QZ.elapsed || {}; QZ.elapsed[curQ] = 0;
    phase = "open"; paused = false; save();
    sl.classList.remove("ready");
    FX.sfx("ding");
    startTimer(); setTimerUI(); renderQuiz();
    publishState(true);
  }
  function toggleTimer() {
    if (phase === "ready") { startVoting(); return; }
    if (curQ == null || QZ.revealed[curQ]) return;
    if (phase === "closed") { // reabre com +15s
      QZ.elapsed[curQ] = Math.max(0, CONFIG.QUESTION_TIME * 1000 - 15000); phase = "open"; paused = false; publishState(true);
    } else paused = !paused;
    setTimerUI();
  }

  function reveal() {
    if (curQ == null || QZ.revealed[curQ]) return;
    QZ.revealed[curQ] = true; save();
    phase = "reveal"; paused = false;
    const sl = $(`.slide.quiz[data-q="${curQ}"]`);
    renderQuiz(); setTimerUI();
    sl.classList.remove("urgent");
    sl.classList.add("revealed");
    const ok = QUESTIONS[curQ].a;
    setTimeout(() => {
      shake(); FX.sfx("thud");
      FX.kick(1, ok ? "green" : "red");
      const [x, y] = FX.center($(".stamp", sl));
      FX.sparks(x, y, ok ? "#35d399" : "#ff5a6a", 70);
    }, 420);
    setTimeout(() => {
      const [x, y] = FX.center($(ok ? ".bar.isV .col" : ".bar.isF .col", sl));
      FX.confetti(x, y, 120); FX.sfx("ding");
    }, 1100);
    publishState(true);
  }

  function ranking() {
    const total = CONFIG.QUESTION_TIME * 1000;
    const P = {};
    for (let q = 0; q < N; q++) {
      if (!QZ.revealed[q]) continue;
      const opened = QZ.opened[q] || 0;
      Object.entries(QZ.votes[q] || {}).forEach(([id, v]) => {
        if (v.manual) return;
        const p = (P[id] = P[id] || { id, nick: v.nick, pts: 0, hits: 0 });
        if (v.nick) p.nick = v.nick;
        const ok = (v.a === "V") === QUESTIONS[q].a;
        if (ok) { p.hits++; p.pts += 100 + Math.round(50 * Math.max(0, 1 - (v.at - opened) / total)); }
      });
    }
    return Object.values(P).sort((a, b) => b.pts - a.pts || b.hits - a.hits).slice(0, 11);
  }

  function renderPlenary() {
    let top = ranking();
    if (!top.length && document.body.classList.contains("shot")) // exemplo só para a imagem do roteiro
      top = ["Ana", "Pedro", "Júlia", "Lucas", "Marina", "Rafael", "Bia", "Caio", "Lara", "Davi", "Sofia"].map((nick, k) => ({ nick, pts: 720 - k * 55, hits: Math.max(2, 5 - Math.floor(k / 3)) }));
    const arc = $("#arc"); arc.innerHTML = "";
    const order = [5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10];
    const podium = $("#podium");
    podium.style.opacity = 0;
    top.forEach((p, rank) => {
      const slot = order[rank];
      const ang = Math.PI - (slot / 10) * Math.PI;
      const d = document.createElement("div");
      d.className = "mseat" + (rank < 3 ? " top" : "");
      d.style.left = 810 + Math.cos(ang) * 720 + "px";
      d.style.top = 330 - Math.sin(ang) * 300 + "px";
      d.innerHTML = `<div class="chair">${rank + 1}º</div><div class="nm">${esc(p.nick || "Anônimo")}</div><div class="pt">${p.pts} pts · ${p.hits}/${N}</div>`;
      arc.appendChild(d);
      const delay = 600 + (top.length - 1 - rank) * 420 + (rank === 0 ? 900 : 0);
      setTimeout(() => {
        d.classList.add("in");
        const [x, y] = FX.center(d);
        if (rank === 0) { FX.confetti(x, y, 220, 1.4); FX.rain(200); FX.sfx("fanfare"); podium.style.transition = "opacity .8s"; podium.style.opacity = 1; }
        else { FX.sparks(x, y, rank < 3 ? "#f5d68a" : "#9aa6c4", 20); FX.sfx("pop"); }
      }, delay);
    });
    podium.innerHTML = top.length
      ? `🏆 Presidente do Plenário: <b>${esc(top[0].nick || "Anônimo")}</b> · ${top[0].pts} pontos`
      : "Nenhum voto registrado pelo celular nesta sessão.";
    if (!top.length) podium.style.opacity = 1;
    return top;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function publishState(viaNtfy = false) {
    const st = { ts: Date.now(), session: QZ.session, phase, q: curQ, total: N };
    if (curQ != null) { const c = counts(curQ); st.n = c.n; }
    if (phase === "end") st.top = ranking().map((p) => ({ id: p.id, nick: p.nick, pts: p.pts, hits: p.hits }));
    bus.publish("state", st, { retain: true, ntfy: viaNtfy });
  }
  let dirty = false;
  setInterval(() => { if (dirty) { dirty = false; publishState(false); } }, 1500);
  setInterval(() => publishState(false), 10000);

  function onEnter(s) {
    if (s.dataset.q != null) {
      curQ = +s.dataset.q; lastSec = null;
      if (QZ.revealed[curQ]) { phase = "reveal"; s.classList.add("revealed"); s.classList.remove("ready"); }
      else {
        s.classList.remove("revealed");
        QZ.elapsed = QZ.elapsed || {}; QZ.started = QZ.started || {};
        paused = false;
        if (!QZ.started[curQ]) { phase = "ready"; s.classList.add("ready"); clearInterval(tick); save(); } // apresentador lê primeiro; celulares aguardam
        else {
          s.classList.remove("ready");
          QZ.opened[curQ] = QZ.opened[curQ] || Date.now();
          phase = (QZ.elapsed[curQ] || 0) >= CONFIG.QUESTION_TIME * 1000 ? "closed" : "open";
          save(); startTimer();
        }
      }
      renderQuiz(); setTimerUI();
    } else {
      clearInterval(tick); curQ = null;
      const idx = slides.indexOf(s);
      const quizStart = slides.findIndex((x) => x.dataset.lobby != null);
      const resIdx = slides.findIndex((x) => x.dataset.result != null);
      if (s.dataset.lobby != null) { resetQuiz(); phase = "lobby"; }
      else if (idx >= resIdx) { phase = "end"; if (s.dataset.result != null) renderPlenary(); }
      else if (idx < quizStart) phase = "idle";
    }
    publishState(true);
  }
  function onLeave(s) { if (s.dataset.q != null) { clearInterval(tick); s.classList.remove("urgent"); } }

  // ao (re)entrar no lobby: zera votos/ranking e manda os celulares esquecerem as respostas (ninguém é desconectado)
  function resetQuiz() {
    QZ = { session: uid(6), votes: {}, opened: {}, revealed: {}, elapsed: {}, started: {} }; save();
    $$(".slide.quiz").forEach((x) => { x.classList.remove("revealed"); x.classList.remove("ready"); });
  }

  function resetAll() {
    if (!confirm("Zerar TODA a votação (votos, tempos e ranking)?")) return;
    QZ = { session: uid(6), votes: {}, opened: {}, revealed: {}, elapsed: {} }; save();
    Object.keys(crowd).forEach((id) => { crowd[id].el.remove(); delete crowd[id]; }); crowdFit();
    $$(".slide.quiz").forEach((s) => s.classList.remove("revealed"));
    const s = slides[cur]; cur = -1; go(slides.indexOf(s));
  }

  window.__deck = { go, next, slides, manualVote, reveal };
  // modo captura (?shot=N): mostra o slide N já com tudo revelado, sem animação (usado para gerar o roteiro)
  const shot = parseInt(new URLSearchParams(location.search).get("shot"), 10);
  if (shot > 0) { document.body.classList.add("shot"); go(Math.min(shot, slides.length) - 1, true); return; }
  const start = parseInt((location.hash || "").slice(1), 10);
  go(Number.isFinite(start) && start > 0 ? Math.min(start, slides.length) - 1 : 0);
})();
