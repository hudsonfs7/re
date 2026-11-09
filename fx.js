/* ============================================================
   FX: motor de animações da apresentação
   - fundo de partículas (constelação) com "warp" na troca de slide
   - confete, faíscas, texto palavra por palavra, contadores
   - sons sintetizados (tecla S liga/desliga; começa desligado)
   ============================================================ */
window.FX = (() => {
  const reduce = false; // animações sempre ligadas, em qualquer máquina
  const vp = document.getElementById("viewport");

  /* ---------- fundo de partículas ---------- */
  const bg = document.createElement("canvas");
  bg.id = "bgfx";
  vp.prepend(bg);
  const g = bg.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const P = [];
  let warp = 0, warpDir = 1, mx = 0, my = 0, hue = "gold";
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = bg.width = innerWidth * DPR; H = bg.height = innerHeight * DPR;
    top.width = W; top.height = H;
  }
  for (let i = 0; i < 110; i++) {
    P.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, vx: (Math.random() - 0.5) * 0.00025, vy: (Math.random() - 0.5) * 0.00025, gold: Math.random() < 0.35 });
  }
  addEventListener("mousemove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  let lastT = performance.now();
  function drawBg() {
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    g.clearRect(0, 0, W, H);
    warp = Math.max(0, warp - dt * 1.8);
    const pts = [];
    for (const p of P) {
      p.x += p.vx + warp * 0.004 * warpDir * p.z;
      p.y += p.vy;
      if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05;
      const x = (p.x + mx * 0.03 * p.z) * W, y = (p.y + my * 0.03 * p.z) * H;
      pts.push([x, y, p]);
    }
    const md = 150 * DPR;
    g.lineWidth = DPR;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
        const d = dx * dx + dy * dy;
        if (d < md * md) {
          const a = (1 - Math.sqrt(d) / md) * 0.18;
          g.strokeStyle = hue === "red" ? `rgba(255,90,106,${a})` : hue === "green" ? `rgba(53,211,153,${a})` : `rgba(227,181,74,${a})`;
          g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke();
        }
      }
    }
    for (const [x, y, p] of pts) {
      const r = (1 + p.z * 1.8) * DPR;
      g.fillStyle = p.gold ? `rgba(245,214,138,${0.35 + p.z * 0.5})` : `rgba(150,170,230,${0.25 + p.z * 0.4})`;
      if (warp > 0.05) { // rastro de velocidade
        g.strokeStyle = g.fillStyle; g.lineWidth = r;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - warp * 60 * DPR * warpDir * p.z, y); g.stroke();
      }
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
  }

  /* ---------- camada de confete/faíscas ---------- */
  const top = document.createElement("canvas");
  top.id = "fxtop";
  document.body.appendChild(top);
  const t = top.getContext("2d");
  const C = [];
  const COLORS = ["#e3b54a", "#f5d68a", "#35d399", "#5b8cff", "#ff5a6a", "#ffffff"];
  function confetti(x = innerWidth / 2, y = innerHeight / 2, n = 140, spread = 1) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (4 + Math.random() * 12) * spread;
      C.push({ x: x * DPR, y: y * DPR, vx: Math.cos(a) * s * DPR, vy: (Math.sin(a) * s - 8) * DPR, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, w: (6 + Math.random() * 8) * DPR, h: (3 + Math.random() * 5) * DPR, c: COLORS[(Math.random() * COLORS.length) | 0], life: 1 });
    }
  }
  function rain(n = 200) { // chuva de confete do topo
    for (let i = 0; i < n; i++) {
      C.push({ x: Math.random() * W, y: -Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 3 * DPR, vy: (2 + Math.random() * 4) * DPR, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, w: (6 + Math.random() * 8) * DPR, h: (3 + Math.random() * 5) * DPR, c: COLORS[(Math.random() * COLORS.length) | 0], life: 1.6 });
    }
  }
  function sparks(x, y, color = "#f5d68a", n = 24) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 7;
      C.push({ x: x * DPR, y: y * DPR, vx: Math.cos(a) * s * DPR, vy: Math.sin(a) * s * DPR, r: 0, vr: 0, w: 3 * DPR, h: 3 * DPR, c: color, life: 0.7, spark: true });
    }
  }
  function drawTop() {
    t.clearRect(0, 0, W, H);
    for (let i = C.length - 1; i >= 0; i--) {
      const p = C[i];
      p.x += p.vx; p.y += p.vy; p.vy += (p.spark ? 0.05 : 0.25) * DPR; p.vx *= 0.99; p.r += p.vr;
      p.life -= p.spark ? 0.02 : 0.006;
      if (p.life <= 0 || p.y > H + 40) { C.splice(i, 1); continue; }
      t.globalAlpha = Math.min(1, p.life);
      t.fillStyle = p.c;
      t.save(); t.translate(p.x, p.y); t.rotate(p.r);
      if (p.spark) { t.beginPath(); t.arc(0, 0, p.w, 0, 6.283); t.fill(); }
      else t.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + DPR);
      t.restore();
    }
    t.globalAlpha = 1;
  }

  function loop() { drawBg(); if (C.length) drawTop(); else t.clearRect(0, 0, W, H); requestAnimationFrame(loop); }
  addEventListener("resize", resize); resize();
  if (!reduce) requestAnimationFrame(loop); else drawBg();

  /* ---------- texto palavra por palavra / letra por letra ---------- */
  function splitWords(el, mode = "w") {
    if (!el || el.dataset.split) return;
    el.dataset.split = 1;
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          const parts = mode === "c" ? [...n.textContent] : n.textContent.split(/(\s+)/);
          parts.forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
            const s = document.createElement("span");
            s.className = mode === "c" ? "ch" : "w";
            s.style.setProperty("--i", i++);
            s.textContent = w;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
  }

  /* ---------- contadores ---------- */
  function countUp(el, to, ms = 1200) {
    const from = 0, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- sons sintetizados ---------- */
  let ac = null, soundOn = false;
  function sfx(kind) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const now = ac.currentTime;
      const tone = (f, d, type = "sine", v = 0.15, delay = 0, f2) => {
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = type; o.frequency.setValueAtTime(f, now + delay);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + delay + d);
        gn.gain.setValueAtTime(v, now + delay); gn.gain.exponentialRampToValueAtTime(0.0001, now + delay + d);
        o.connect(gn).connect(ac.destination); o.start(now + delay); o.stop(now + delay + d + 0.05);
      };
      if (kind === "whoosh") tone(220, 0.35, "sawtooth", 0.03, 0, 880);
      else if (kind === "pop") tone(660, 0.12, "triangle", 0.12, 0, 990);
      else if (kind === "tick") tone(1200, 0.05, "square", 0.04);
      else if (kind === "thud") { tone(140, 0.35, "sine", 0.5, 0, 50); tone(80, 0.4, "triangle", 0.3); }
      else if (kind === "ding") { tone(880, 0.6, "sine", 0.12); tone(1320, 0.6, "sine", 0.08, 0.08); }
      else if (kind === "fanfare") [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.4, "triangle", 0.12, k * 0.12));
    } catch (e) { }
  }
  function toggleSound() { soundOn = !soundOn; if (soundOn) sfx("ding"); return soundOn; }

  /* ---------- transições ---------- */
  function kick(dir = 1, color = "gold") {
    warpDir = dir; warp = 1; hue = color;
    if (color !== "gold") setTimeout(() => (hue = "gold"), 1800);
  }
  const wipeEl = document.createElement("div");
  wipeEl.id = "wipe";
  wipeEl.innerHTML = "<i></i><i></i><i></i>";
  document.body.appendChild(wipeEl);
  function wipe() {
    if (reduce) return;
    wipeEl.classList.remove("go"); void wipeEl.offsetWidth; wipeEl.classList.add("go");
  }

  // posição (na janela) do centro de um elemento
  function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  return { confetti, rain, sparks, splitWords, countUp, sfx, toggleSound, kick, wipe, center, get soundOn() { return soundOn; } };
})();
