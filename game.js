'use strict';
// Звезда твирлинга — сцена на canvas, касания, звук, окна. Правила — logic.js (TW).
(() => {
const $ = id => document.getElementById(id);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };
const lj = (k, d) => { try { return JSON.parse(ls(k)) ?? d; } catch (e) { return d; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rnd = (a, b) => a + Math.random() * (b - a);
const { LEVELS, SHOP } = TW;

// ─── звук: колокольчики, свист броска, шум трибун, мелодия «С днём рождения» (общественное достояние) ───
let ac = null, out = null, rev = null;
const soundOn = () => ls('tw_sound') !== '0';
function audio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = soundOn() ? 0.6 : 0; out.connect(ac.destination);
    rev = ac.createConvolver(); const len = ac.sampleRate * 2, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = b; const wet = ac.createGain(); wet.gain.value = 0.3; rev.connect(wet); wet.connect(out);
  }
  if (ac.state === 'suspended') ac.resume();
}
function bell(f, t = 0, dur = 0.9, v = 0.12) {
  if (!ac) return; const t0 = ac.currentTime + t, g = ac.createGain();
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  for (const [m, a] of [[1, 1], [2.001, 0.25], [3.01, 0.06]]) { const o = ac.createOscillator(), k = ac.createGain(); o.frequency.value = f * m; k.gain.value = a; o.connect(k); k.connect(g); o.start(t0); o.stop(t0 + dur + 0.05); }
  g.connect(out); g.connect(rev);
}
function noise(dur, f0, f1, v, type = 'bandpass', t = 0) {
  if (!ac) return; const t0 = ac.currentTime + t, len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; fl.type = type;
  fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t0);
}
const sWhoosh = p => noise(0.35, 500, 2500 + 2000 * p, 0.25);
const sCatch = g => g === 'perfect' ? [0, 4, 7, 12].forEach((s, k) => bell(659.25 * Math.pow(2, s / 12), k * 0.06, 0.8, 0.1)) : bell(659.25, 0, 0.7, 0.12);
const sDrop = () => { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(50, t0 + 0.25);
  g.gain.setValueAtTime(0.35, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.35); };
const sCrowd = (v = 0.18, dur = 1.6) => noise(dur, 900, 1400, v, 'bandpass');
const sShake = () => noise(0.09, 3000, 6000, 0.08, 'highpass');
function sBirthday() {                                                             // «С днём рождения тебя» — колокольчиками
  const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  const song = [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2], ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
    ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2], ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2.5]];
  let t = 0.1; for (const [n, d] of song) { bell(N[n], t, d * 0.42 + 0.3, 0.11); t += d * 0.42; }
}
for (const ev of ['pointerdown', 'touchend']) addEventListener(ev, audio, { passive: true });

// ─── сохранения ───
let owned = lj('tw_owned', { costume: ['pink'], baton: ['silver'], pompom: ['pink'], extra: [] });
let wear = lj('tw_wear', { costume: 'pink', baton: 'silver', pompom: 'pink', extra: '' });
let starsN = +ls('tw_stars') || 0, medals = lj('tw_medals', {}), best = lj('tw_best', {});
const saveAll = () => { ls('tw_owned', JSON.stringify(owned)); ls('tw_wear', JSON.stringify(wear)); ls('tw_stars', starsN); ls('tw_medals', JSON.stringify(medals)); ls('tw_best', JSON.stringify(best)); };
const item = k => SHOP[k].find(x => x.id === wear[k]) || SHOP[k][0];
const unlocked = () => Math.min(LEVELS.length - 1, Object.keys(medals).length ? Math.max(...Object.keys(medals).map(Number)) + 1 : 0);

// ─── сцена ───
const cv = $('cv'), cx = cv.getContext('2d');
let W = 0, H = 0, groundY = 0, u = 1, GX = 0;
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = H * 0.86; u = Math.min(H * 0.32, W * 0.7) / 100; GX = W / 2;
  crowd = Array.from({ length: Math.ceil(W / 18) * 3 }, (_, i) => ({ x: (i % Math.ceil(W / 18)) * 18 + rnd(-4, 4), row: Math.floor(i / Math.ceil(W / 18)), c: `hsl(${rnd(0, 360)},60%,${rnd(55, 75)}%)`, ph: rnd(0, 6) }));
}
let crowd = [];
addEventListener('resize', resize);
const hand = () => ({ x: GX + 18 * u, y: groundY - 93 * u });                       // правая рука, поднятая для ловли

// игра: phase — ready (ждёт касания), charge (держит палец), fly, catch, drop, cheer, end; home — главный экран
const G = { mode: 'home', phase: 'ready', L: 0, t: 0 };
const pops = [], parts = [];
function pop(text, x, y, color = '#fff', size = 30) { pops.push({ text, x, y, color, size, t0: G.t }); }
function confetti(x, y, n = 40, spread = 1) {
  const cols = ['#ff4f9a', '#ffc21a', '#7c4dff', '#3fd6ff', '#5fe3a1', '#ffffff'];
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-260, 260) * spread, vy: rnd(-520, -160) * spread, r: rnd(0, 6), vr: rnd(-8, 8), c: cols[i % cols.length], w: rnd(5, 9), h: rnd(3, 6), life: rnd(1.4, 2.4), t0: G.t });
}
function sparkle(x, y, n = 14) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; parts.push({ x, y, vx: Math.cos(a) * rnd(120, 220), vy: Math.sin(a) * rnd(120, 220), star: true, c: '#fff6b0', life: 0.6, t0: G.t, r: 0, vr: 0, w: 4, h: 4 }); } }

function background() {
  const hue = G.mode === 'play' ? LEVELS[G.L].hue : 285;
  const g = cx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${hue},70%,12%)`); g.addColorStop(0.55, `hsl(${hue + 20},65%,22%)`); g.addColorStop(1, `hsl(${hue + 30},60%,10%)`);
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  // трибуны — силуэты зрителей, при чир-моменте прыгают
  const hype = G.phase === 'cheer' ? 1 : 0.25;
  for (const p of crowd) { const y = groundY - 60 * u - p.row * 22 - 40 + Math.max(0, Math.sin(G.t * 6 + p.ph)) * 6 * hype;
    cx.fillStyle = `rgba(0,0,0,${0.55 - p.row * 0.12})`; cx.beginPath(); cx.arc(p.x, y, 8, 0, 7); cx.fill(); cx.fillRect(p.x - 9, y + 6, 18, 30);
    if (G.phase === 'cheer' && p.row === 0) { cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x + 9, y - 14 - Math.sin(G.t * 12 + p.ph) * 6, 4, 0, 7); cx.fill(); } }
  // прожекторы
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (const [sx, ph, col] of [[W * 0.1, 0, '255,120,200'], [W * 0.9, 2, '120,180,255'], [W * 0.5, 4, '255,220,140']]) {
    const tx = GX + Math.sin(G.t * 0.7 + ph) * W * 0.35, gr = cx.createLinearGradient(sx, 0, tx, groundY);
    gr.addColorStop(0, `rgba(${col},.32)`); gr.addColorStop(1, `rgba(${col},0)`); cx.fillStyle = gr;
    cx.beginPath(); cx.moveTo(sx - 8, 0); cx.lineTo(sx + 8, 0); cx.lineTo(tx + 70, groundY); cx.lineTo(tx - 70, groundY); cx.closePath(); cx.fill();
  }
  cx.restore();
  // ковёр-сцена и пятно света под девочкой
  const fg = cx.createLinearGradient(0, groundY, 0, H); fg.addColorStop(0, `hsl(${hue + 330},55%,30%)`); fg.addColorStop(1, `hsl(${hue + 330},50%,14%)`);
  cx.fillStyle = fg; cx.fillRect(0, groundY, W, H - groundY);
  const sp = cx.createRadialGradient(GX, groundY + 6, 4, GX, groundY + 6, 90 * u); sp.addColorStop(0, 'rgba(255,240,255,.45)'); sp.addColorStop(1, 'rgba(255,240,255,0)');
  cx.fillStyle = sp; cx.beginPath(); cx.ellipse(GX, groundY + 6, 90 * u, 14 * u, 0, 0, 7); cx.fill();
}

// ─── девочка: всё в единицах u (рост — 100), начало координат — под ногами ───
const SKIN = '#f6c9a8', HAIR = '#5a3424';
function rr(x, y, w, h, r) { cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, r) : cx.rect(x, y, w, h); }
function pompom(x, y, cols, shake) {
  for (let i = 0; i < 16; i++) { const a = i * 2.4, d = (i % 4) * 2.1 + 1.5; cx.fillStyle = cols[i % cols.length];
    cx.beginPath(); cx.arc(x + Math.cos(a + shake) * d * u, y + Math.sin(a + shake) * d * u, 3.2 * u, 0, 7); cx.fill(); }
  cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.arc(x - 2 * u, y - 2.5 * u, 1.6 * u, 0, 7); cx.fill();
}
function arm(x0, y0, x1, y1) { cx.strokeStyle = SKIN; cx.lineWidth = 4.6 * u; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x0 * u, y0 * u); cx.lineTo(x1 * u, y1 * u); cx.stroke();
  cx.fillStyle = SKIN; cx.beginPath(); cx.arc(x1 * u, y1 * u, 2.9 * u, 0, 7); cx.fill(); }
function girl(P) {
  const co = item('costume'), [c1, c2] = co.c, pc = item('pompom').c, t = G.t;
  cx.save(); cx.translate(GX, groundY - (P.jump || 0) * u + (P.squat || 0) * u);
  // ноги и сапожки
  cx.fillStyle = SKIN; rr(-8.5 * u, -36 * u, 6 * u, 30 * u, 3 * u); cx.fill(); rr(2.5 * u, -36 * u, 6 * u, 30 * u, 3 * u); cx.fill();
  cx.fillStyle = '#fff'; rr(-9.5 * u, -10 * u, 8 * u, 10 * u, 3 * u); cx.fill(); rr(1.5 * u, -10 * u, 8 * u, 10 * u, 3 * u); cx.fill();
  // костюм: купальник с юбочкой
  let fill; if (co.rainbow) { fill = cx.createLinearGradient(-18 * u, 0, 18 * u, 0); ['#ff5f6d', '#ffc371', '#5fe3a1', '#5f9dff', '#b16bff'].forEach((c, i) => fill.addColorStop(i / 4, c)); }
  else { fill = cx.createLinearGradient(0, -64 * u, 0, -32 * u); fill.addColorStop(0, c2); fill.addColorStop(1, c1); }
  cx.fillStyle = fill; cx.beginPath(); cx.moveTo(-9 * u, -63 * u); cx.lineTo(9 * u, -63 * u); cx.lineTo(11 * u, -45 * u);
  cx.quadraticCurveTo(19 * u, -38 * u, 19 * u, -33 * u); cx.quadraticCurveTo(0, -29 * u, -19 * u, -33 * u); cx.quadraticCurveTo(-19 * u, -38 * u, -11 * u, -45 * u); cx.closePath(); cx.fill();
  cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 1.2 * u; cx.beginPath(); cx.moveTo(-11 * u, -45 * u); cx.lineTo(11 * u, -45 * u); cx.stroke();
  cx.fillStyle = 'rgba(255,255,255,.9)';                                              // блёстки
  for (let i = 0; i < (co.sparkle || co.rainbow ? 9 : 5); i++) { const sx = Math.sin(i * 7.3) * 12, sy = -40 - (i * 13 % 20); if (Math.sin(t * 5 + i) > 0.2) { cx.beginPath(); cx.arc(sx * u, sy * u, 0.9 * u, 0, 7); cx.fill(); } }
  // руки: левая с помпоном; правая — ловит жезл (P.arm: 0 — внизу, 1 — вверх)
  const shake = P.cheer ? Math.sin(t * 30) * 0.6 : Math.sin(t * 2) * 0.15;
  const lh = P.cheer ? [-20 + Math.sin(t * 22) * 2, -90] : [-21, -44 + Math.sin(t * 2.2) * 1];
  arm(-9, -60, lh[0], lh[1]); pompom(lh[0] * u, lh[1] * u, pc, shake);
  const a = P.arm ?? 1, rx = 20 - 2 * a, ry = -44 - 49 * a;
  arm(9, -60, P.cheer ? 20 + Math.sin(t * 22 + 1) * 2 : rx, P.cheer ? -90 : ry);
  if (P.cheer) pompom((20 + Math.sin(t * 22 + 1) * 2) * u, -90 * u, pc, -shake);
  // шея, волосы, голова
  cx.fillStyle = SKIN; rr(-2.5 * u, -67 * u, 5 * u, 6 * u, 2 * u); cx.fill();
  cx.fillStyle = HAIR; cx.beginPath(); cx.ellipse(0, -78 * u, 14 * u, 14.5 * u, 0, 0, 7); cx.fill();
  const sw = Math.sin(t * 4 + (P.jump || 0) * 0.2) * 0.25;                            // хвост качается
  cx.save(); cx.translate(5 * u, -90 * u); cx.rotate(0.5 + sw); cx.beginPath(); cx.ellipse(8 * u, 0, 10 * u, 4.5 * u, 0.2, 0, 7); cx.fill(); cx.restore();
  cx.fillStyle = SKIN; cx.beginPath(); cx.arc(0, -76 * u, 12 * u, 0, 7); cx.fill();
  cx.fillStyle = HAIR; cx.beginPath(); cx.moveTo(-12.5 * u, -78 * u); cx.quadraticCurveTo(-11 * u, -92 * u, 0, -91 * u); cx.quadraticCurveTo(11 * u, -92 * u, 12.5 * u, -78 * u);
  cx.quadraticCurveTo(6 * u, -86 * u, -2 * u, -83 * u); cx.quadraticCurveTo(-8 * u, -84 * u, -12.5 * u, -78 * u); cx.fill();
  cx.fillStyle = c1; cx.beginPath(); cx.ellipse(3 * u, -91 * u, 4 * u, 2.4 * u, -0.4, 0, 7); cx.ellipse(9 * u, -93 * u, 4 * u, 2.4 * u, 0.4, 0, 7); cx.fill();   // бантик
  // лицо
  cx.fillStyle = '#3a2340'; for (const ex of [-4.5, 4.5]) { cx.beginPath(); if (P.happy) { cx.lineWidth = 1.3 * u; cx.strokeStyle = '#3a2340'; cx.arc(ex * u, -75.5 * u, 2 * u, Math.PI * 1.1, Math.PI * 1.9); cx.stroke(); } else { cx.ellipse(ex * u, -76 * u, 1.7 * u, 2.1 * u, 0, 0, 7); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc((ex + 0.6) * u, -76.8 * u, 0.6 * u, 0, 7); cx.fill(); cx.fillStyle = '#3a2340'; } }
  cx.fillStyle = 'rgba(255,120,150,.45)'; cx.beginPath(); cx.ellipse(-7.5 * u, -72 * u, 2.4 * u, 1.4 * u, 0, 0, 7); cx.ellipse(7.5 * u, -72 * u, 2.4 * u, 1.4 * u, 0, 0, 7); cx.fill();
  cx.strokeStyle = '#a3344f'; cx.lineWidth = 1.2 * u; cx.beginPath();
  if (P.sad) cx.arc(0, -68.5 * u, 2.2 * u, Math.PI * 1.15, Math.PI * 1.85); else cx.arc(0, -71.5 * u, 2.8 * u, Math.PI * 0.15, Math.PI * 0.85); cx.stroke();
  if (wear.extra === 'crown') {                                                       // корона именинницы
    cx.fillStyle = '#ffc21a'; cx.strokeStyle = '#d18b00'; cx.lineWidth = 0.8 * u; cx.beginPath(); cx.moveTo(-7 * u, -88 * u);
    [[-7, -96], [-3.5, -91], [0, -98], [3.5, -91], [7, -96], [7, -88]].forEach(([x, y]) => cx.lineTo(x * u, y * u)); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle = '#ff4f9a'; cx.beginPath(); cx.arc(0, -92 * u, 1.2 * u, 0, 7); cx.fill();
  }
  cx.restore();
}
function baton(x, y, a, alpha = 1) {
  const b = item('baton'), L = 21 * u;
  cx.save(); cx.globalAlpha = alpha; cx.translate(x, y); cx.rotate(a);
  if (b.glow) { cx.shadowColor = '#38e8ff'; cx.shadowBlur = 16; }
  let gr = cx.createLinearGradient(-L, 0, L, 0);
  if (b.rainbow) ['#ff5f6d', '#ffc371', '#5fe3a1', '#5f9dff', '#b16bff'].forEach((c, i) => gr.addColorStop(i / 4, c)); else { gr.addColorStop(0, b.c[0]); gr.addColorStop(0.5, b.c[1]); gr.addColorStop(1, b.c[0]); }
  cx.strokeStyle = gr; cx.lineWidth = 2.6 * u; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(-L, 0); cx.lineTo(L, 0); cx.stroke();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.ellipse(L, 0, 3.6 * u, 3.2 * u, 0, 0, 7); cx.fill(); cx.beginPath(); cx.ellipse(-L, 0, 2.8 * u, 2.5 * u, 0, 0, 7); cx.fill();
  cx.restore();
}

// ─── игра ───
let fl = null, chargeT0 = 0, phaseT0 = 0, st = null, tutor = !ls('tw_tut');
function startLevel(L) {
  G.mode = 'play'; G.L = L; st = { throws: LEVELS[L].throws, n: 0, hearts: 3, score: 0, combo: 0, streak: 0, perfect: 0, drops: 0, caught: 0 };
  setPhase('ready'); $('home').hidden = true; $('sign').hidden = true; $('hud').hidden = false; ['levels', 'result'].forEach(id => $(id).hidden = true); hud();
}
function setPhase(p) { G.phase = p; phaseT0 = G.t; }
function hud() {
  $('hLvl').querySelector('b').textContent = LEVELS[G.L].n;
  $('hLvl').querySelector('small').textContent = `Бросок ${Math.min(st.n + (G.phase === 'ready' || G.phase === 'charge' ? 1 : 0), st.throws)} из ${st.throws} · ${'❤️'.repeat(st.hearts)}${'🤍'.repeat(3 - st.hearts)}`;
  $('hScore').innerHTML = `${st.score}<small>${st.combo > 1 ? `серия ×${st.combo}` : '&nbsp;'}</small>`;
}
function throwIt() {
  const power = Math.min(1, (G.t - chargeT0) / 0.9), f = TW.flight(power, G.L), h = hand();
  fl = { ...f, h: (h.y - H * 0.13) * f.hk, t0: G.t, a0: (G.t * 9) % (Math.PI * 2), x: h.x }; st.n++; sWhoosh(power); setPhase('fly'); hud();
}
function tryCatch() {
  const e = G.t - fl.t0 - fl.T, [, gw] = LEVELS[G.L].win;
  if (e < -0.4) { pop('Ещё рано!', W / 2, H * 0.3, '#ffd6ec', 22); return; }      // случайное касание в начале полёта не считается
  const g = TW.grade(e, G.L);
  if (g === 'miss') { drop(e < 0 ? 'Рано!' : 'Поздно!'); return; }
  const h = hand(), pts = TW.points(fl.spins, g, st.combo);
  st.score += pts; st.combo++; st.streak++; st.caught++; if (g === 'perfect') st.perfect++;
  pop(g === 'perfect' ? 'Идеально!' : 'Хорошо!', h.x, h.y - 50 * u, g === 'perfect' ? '#ffe066' : '#9ff3e3', g === 'perfect' ? 34 : 28);
  pop(`+${pts} · ${fl.spins} ${fl.spins === 1 ? 'оборот' : fl.spins < 5 ? 'оборота' : 'оборотов'}`, h.x, h.y - 25 * u, '#fff', 18);
  sCatch(g); sparkle(h.x, h.y); if (g === 'perfect') confetti(h.x, h.y, 16, 0.6);
  fl = null; setPhase('catch'); hud();
  if (tutor) { tutor = false; ls('tw_tut', 1); }
}
function drop(why) {
  st.hearts--; st.drops++; st.combo = 0; st.streak = 0; sDrop(); pop(why + ' Уронила…', W / 2, H * 0.32, '#ff9fb3', 26);
  fl.dropAt = G.t; setPhase('drop'); hud();
}
function afterThrow() {                                                              // что дальше: чир-момент, следующий бросок или конец
  if (st.hearts <= 0 || st.n >= st.throws) return finish();
  if (G.phase === 'catch' && st.streak > 0 && st.streak % 3 === 0) { st.cheerTaps = 0; setPhase('cheer'); sCrowd(0.25, 2); pop('Чир-момент! Жми быстро!', W / 2, H * 0.28, '#ffc21a', 30); return; }
  setPhase('ready'); hud();
}
function finish() {
  setPhase('end'); const m = TW.medal(st), L = G.L, gained = TW.stars(st.score);
  starsN += gained; best[L] = Math.max(best[L] || 0, st.score);
  const rank = { bronze: 1, silver: 2, gold: 3 }; if (m && (rank[m] > (rank[medals[L]] || 0))) medals[L] = m;
  saveAll();
  if (m) { confetti(W / 2, H * 0.4, 90, 1.2); sCrowd(0.3, 2.5); [0, 4, 7, 12, 16].forEach((s, k) => bell(523.25 * Math.pow(2, s / 12), k * 0.12, 1.4, 0.1)); }
  setTimeout(() => {
    $('rMedal').textContent = m ? { gold: '🥇', silver: '🥈', bronze: '🥉' }[m] : '💪';
    $('rTitle').textContent = m ? { gold: 'Золото!', silver: 'Серебро!', bronze: 'Бронза!' }[m] : 'Почти получилось!';
    $('rText').innerHTML = `Очки: <b>${st.score}</b> · поймано ${st.caught} из ${st.n}, идеально ${st.perfect}<br>+${gained} ⭐ в копилку` + (m === 'gold' ? '' : m ? '<br>Для золота: без падений и половина бросков — идеально' : '<br>Попробуй бросать пониже — так легче поймать');
    const next = m && L < LEVELS.length - 1;
    $('rNext').textContent = next ? 'Следующее выступление ▶' : 'Ещё раз'; $('rNext').dataset.l = next ? L + 1 : L; $('rAgain').hidden = !next;
    $('result').hidden = false;
  }, m ? 900 : 600);
}

// ─── касания ───
cv.addEventListener('pointerdown', e => {
  if (G.mode !== 'play') return; e.preventDefault();
  if (G.phase === 'ready') { chargeT0 = G.t; setPhase('charge'); }
  else if (G.phase === 'fly') tryCatch();
  else if (G.phase === 'cheer') { st.cheerTaps++; st.score += 30; sShake(); if (st.cheerTaps % 5 === 0) sparkle(GX + rnd(-60, 60), groundY - rnd(60, 110) * u, 6); hud(); }
});
addEventListener('pointerup', () => { if (G.mode === 'play' && G.phase === 'charge') throwIt(); });
addEventListener('pointercancel', () => { if (G.mode === 'play' && G.phase === 'charge') throwIt(); });

// ─── кадр ───
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt;
  background();
  const h = hand(); let pose = { arm: 1 }, bx = h.x, by = h.y, ba = G.t * 9, showBaton = true;
  if (G.mode === 'home') { pose = { arm: 1, jump: Math.max(0, Math.sin(G.t * 2.4)) * 3, happy: Math.sin(G.t * 0.5) > 0.6 }; ba = G.t * 7; }
  else if (G.phase === 'charge') { const p = Math.min(1, (G.t - chargeT0) / 0.9); ba = G.t * (9 + 25 * p); pose = { arm: 1, squat: 3 * p }; }
  else if (G.phase === 'fly' || G.phase === 'drop') {
    const s = (G.t - fl.t0) / fl.T; let hy = fl.h * 4 * s * (1 - s);
    by = h.y - hy; ba = fl.a0 + Math.PI * 2 * fl.spins * s;
    if (G.phase === 'fly' && G.t - fl.t0 > fl.T + LEVELS[G.L].win[1]) drop('Поздно!');
    if (by > groundY - 3 * u) { by = groundY - 3 * u + Math.abs(Math.sin((G.t - fl.dropAt) * 12)) * -8 * Math.max(0, 1 - (G.t - fl.dropAt)); ba = 0.15; }
    for (const k of [1, 2]) baton(bx, by + k * 6, ba - k * 0.35, 0.18);              // след вращения
    pose = G.phase === 'drop' ? { arm: 0.6, sad: true } : { arm: Math.min(1, s * 1.5) };
    if (G.phase === 'drop' && G.t - phaseT0 > 1.1) afterThrow();
  }
  else if (G.phase === 'catch') { const k = G.t - phaseT0; pose = { arm: 1, squat: Math.sin(Math.min(1, k / 0.4) * Math.PI) * 3, happy: true }; if (k > 0.5) afterThrow(); }
  else if (G.phase === 'cheer') { showBaton = false; pose = { cheer: true, jump: Math.abs(Math.sin(G.t * 9)) * 6, happy: true }; if (G.t - phaseT0 > 4) { pop(`+${st.cheerTaps * 30} за помпоны!`, W / 2, H * 0.3, '#ffc21a', 26); setPhase('ready'); hud(); } }
  else if (G.phase === 'end') pose = { arm: 1, jump: Math.abs(Math.sin(G.t * 5)) * 4, happy: true };
  girl(pose);
  if (showBaton) baton(bx, by, ba);
  // круг ловли и сила броска
  if (G.mode === 'play' && (G.phase === 'fly' || G.phase === 'charge' || G.phase === 'ready')) {
    const s = fl ? (G.t - fl.t0 - fl.T) : -9, near = Math.abs(s) <= LEVELS[G.L].win[1];
    cx.strokeStyle = near ? 'rgba(255,224,102,.95)' : `rgba(255,255,255,${G.phase === 'fly' ? 0.35 + 0.25 * Math.sin(G.t * 10) : 0.25})`;
    cx.lineWidth = near ? 5 : 3; cx.beginPath(); cx.arc(h.x, h.y, 17 * u, 0, 7); cx.stroke();
    if (G.phase === 'charge') { const p = Math.min(1, (G.t - chargeT0) / 0.9); cx.strokeStyle = `hsl(${120 - 120 * p},90%,60%)`; cx.lineWidth = 7; cx.beginPath(); cx.arc(h.x, h.y, 24 * u, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); cx.stroke(); }
  }
  if (G.mode === 'play' && G.phase === 'cheer') { const k = 1 - (G.t - phaseT0) / 4; cx.fillStyle = 'rgba(255,255,255,.2)'; cx.fillRect(W * 0.15, H * 0.2, W * 0.7, 10); cx.fillStyle = '#ffc21a'; cx.fillRect(W * 0.15, H * 0.2, W * 0.7 * k, 10);
    text(`${st.cheerTaps}`, W / 2, H * 0.2 + 52, '#fff', 40); }
  if (G.mode === 'play' && tutor && (G.phase === 'ready' || G.phase === 'charge')) text('Держи палец на экране — это сила броска. Отпусти — бросок!', W / 2, H * 0.36, '#fff', 17, W * 0.85);
  if (G.mode === 'play' && tutor && G.phase === 'fly') text('Нажми, когда жезл упадёт в круг!', W / 2, H * 0.36, '#ffe066', 19, W * 0.85);
  // частицы и надписи
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i], k = G.t - p.t0; if (k > p.life) { parts.splice(i, 1); continue; }
    const x = p.x + p.vx * k, y = p.y + p.vy * k + (p.star ? 0 : 700 * k * k); cx.globalAlpha = Math.max(0, 1 - k / p.life); cx.fillStyle = p.c;
    if (p.star) { cx.beginPath(); cx.arc(x, y, 3, 0, 7); cx.fill(); } else { cx.save(); cx.translate(x, y); cx.rotate(p.r + p.vr * k); cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore(); } }
  cx.globalAlpha = 1;
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i], k = G.t - p.t0; if (k > 1.2) { pops.splice(i, 1); continue; }
    cx.globalAlpha = Math.min(1, 2.4 - k * 2); text(p.text, p.x, p.y - k * 40, p.color, p.size * (k < 0.12 ? 0.7 + k * 2.5 : 1)); cx.globalAlpha = 1; }
  requestAnimationFrame(frame);
}
function text(s, x, y, c, size, maxW) {
  cx.font = `800 ${size}px -apple-system, "SF Pro Rounded", Roboto, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.lineWidth = 5; cx.strokeStyle = 'rgba(40,10,70,.75)'; cx.lineJoin = 'round';
  if (maxW && cx.measureText(s).width > maxW) { const w = s.split(' '), half = Math.ceil(w.length / 2); text(w.slice(0, half).join(' '), x, y - size * 0.6, c, size); text(w.slice(half).join(' '), x, y + size * 0.6, c, size); return; }
  cx.strokeText(s, x, y); cx.fillStyle = c; cx.fillText(s, x, y);
}

// ─── главный экран, выступления, итоги ───
const name = () => ls('tw_name') || '';
const today = () => { const d = new Date(); return `${d.getMonth() + 1}-${d.getDate()}`; };
function home() {
  G.mode = 'home'; fl = null; $('hud').hidden = true; $('home').hidden = false; $('sign').hidden = false;
  $('hello').textContent = name() ? `Привет, ${name()}! 🌟` : '';
  $('bdayBadge').hidden = ls('tw_bday') !== today();
  $('homeStars').textContent = `⭐ ${starsN}`;
  $('sndBtn').textContent = soundOn() ? '🔊 Звук' : '🔇 Без звука';
}
function levels() {
  const u0 = unlocked();
  $('lvList').innerHTML = LEVELS.map((l, i) => `<button class="lv" data-l="${i}" ${i > u0 ? 'disabled' : ''}><div>${i + 1}. ${l.n}<small>${l.throws} бросков${best[i] ? ` · рекорд ${best[i]}` : ''}</small></div><span>${i > u0 ? '🔒' : { gold: '🥇', silver: '🥈', bronze: '🥉' }[medals[i]] || '▶'}</span></button>`).join('');
  $('levels').hidden = false;
}
$('lvList').onclick = e => { const b = e.target.closest('.lv'); if (b && !b.disabled) { audio(); startLevel(+b.dataset.l); } };
$('playBtn').onclick = levels;
$('lvClose').onclick = () => { $('levels').hidden = true; };
$('rNext').onclick = () => startLevel(+$('rNext').dataset.l);
$('rAgain').onclick = () => startLevel(G.L);
$('rHome').onclick = () => { $('result').hidden = true; home(); };
$('hHome').onclick = () => home();
$('sndBtn').onclick = () => { audio(); ls('tw_sound', soundOn() ? '0' : '1'); if (out) out.gain.value = soundOn() ? 0.6 : 0; home(); };

// ─── гардероб ───
let tab = 'costume';
const TABS = { costume: '👗 Костюм', baton: '🪄 Жезл', pompom: '🎀 Помпоны', extra: '👑 Ещё' };
function shop() {
  $('shopStars').innerHTML = `<p>У тебя ⭐ ${starsN}</p>`;
  $('tabs').innerHTML = Object.entries(TABS).map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('');
  $('items').innerHTML = SHOP[tab].map(x => { const has = owned[tab].includes(x.id), on = wear[tab] === x.id;
    const sw = x.id === 'crown' ? 'background:linear-gradient(#ffe27a,#f0a800)' : x.rainbow || x.c?.length > 2 ? 'background:linear-gradient(90deg,#ff5f6d,#ffc371,#5fe3a1,#5f9dff,#b16bff)' : `background:linear-gradient(135deg,${x.c[0]},${x.c[x.c.length - 1]})`;
    return `<button class="it ${on ? 'on' : ''} ${!has && x.price > starsN ? 'no' : ''}" data-i="${x.id}"><i style="${sw}"></i>${esc(x.n)}<span>${on ? 'надето ✓' : has ? 'надеть' : x.gift ? '🎁 подарок' : `⭐ ${x.price}`}</span></button>`; }).join('');
  $('shop').hidden = false; $('home').hidden = true;
}
$('tabs').onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; shop(); } };
$('items').onclick = e => {
  const b = e.target.closest('.it'); if (!b) return; const x = SHOP[tab].find(i => i.id === b.dataset.i), has = owned[tab].includes(x.id);
  if (!has) { if (x.gift || x.price > starsN) return; starsN -= x.price; owned[tab].push(x.id); bell(880, 0, 0.6, 0.1); }
  wear[tab] = tab === 'extra' && wear.extra === x.id ? '' : x.id; saveAll(); shop();                // корону можно снять
};
$('shopBtn').onclick = () => { audio(); shop(); };
$('shopClose').onclick = () => { $('shop').hidden = true; home(); };

// ─── первый запуск: имя и поздравление (имя хранится только на телефоне) ───
function birthday() {
  for (const k of ['baton', 'extra']) { const id = k === 'baton' ? 'gold' : 'crown'; if (!owned[k].includes(id)) owned[k].push(id); }
  wear.baton = 'gold'; wear.extra = 'crown'; saveAll();
  $('bdayTitle').textContent = name() ? `С днём рождения, ${name()}!` : 'С днём рождения!';
  $('bday').hidden = false; audio(); sBirthday(); confetti(W / 2, H * 0.3, 120, 1.3);
}
$('nameOk').onclick = () => { const n = $('nameIn').value.trim().slice(0, 16); ls('tw_name', n); ls('tw_bday', today()); ls('tw_bdayShown', String(new Date().getFullYear()) + today()); $('nameCard').hidden = true; home(); birthday(); };
$('bdayOk').onclick = () => { $('bday').hidden = true; confetti(W / 2, H * 0.4, 60); home(); };

resize(); home();
if (!ls('tw_bday')) $('nameCard').hidden = false;
else if (ls('tw_bday') === today() && ls('tw_bdayShown') !== String(new Date().getFullYear()) + today()) { ls('tw_bdayShown', String(new Date().getFullYear()) + today()); setTimeout(birthday, 400); }
requestAnimationFrame(frame);
if (/[?&]debug/.test(location.search)) window.TT = { G, st: () => st, fl: () => fl, startLevel, tryCatch, throwIt, chargeAt: t => { chargeT0 = t; } };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
