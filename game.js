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
let W = 0, H = 0, groundY = 0, u = 1, GX = 0, gx = 0, crowd = [], flakes = [], skyStars = [];
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = H * 0.86; u = Math.min(H * 0.32, W * 0.7) / 100; GX = gx = W / 2;
  const n = Math.ceil(W / 18);
  crowd = Array.from({ length: n * 3 }, (_, i) => ({ x: (i % n) * 18 + rnd(-4, 4), row: Math.floor(i / n), c: `hsl(${rnd(0, 360)},65%,${rnd(55, 75)}%)`, ph: rnd(0, 6) }));
  flakes = Array.from({ length: 50 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3), v: rnd(20, 50), ph: rnd(0, 6) }));
  skyStars = Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.4), r: rnd(0.5, 1.6), ph: rnd(0, 6) }));
}
addEventListener('resize', resize);
const hand = () => ({ x: gx + 18 * u, y: groundY - 93 * u });                       // правая рука, поднятая для ловли

// игра: phase — ready (ждёт касания), charge (держит палец), fly, catch, drop, cheer, end; home — главный экран
const G = { mode: 'home', phase: 'ready', L: 0, t: 0, cur: 'none', wind: 0, star: 0, beatT0: 0 };
const pops = [], parts = [];
function pop(text, x, y, color = '#fff', size = 30) { pops.push({ text, x, y, color, size, t0: G.t }); }
function confetti(x, y, n = 40, spread = 1) {
  const cols = ['#9b5cff', '#ff4f9a', '#ffc21a', '#c9a6ff', '#3fd6ff', '#ffffff'];
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-260, 260) * spread, vy: rnd(-520, -160) * spread, r: rnd(0, 6), vr: rnd(-8, 8), c: cols[i % cols.length], w: rnd(5, 9), h: rnd(3, 6), life: rnd(1.4, 2.4), t0: G.t });
}
function sparkle(x, y, n = 14, c = '#fff6b0') { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; parts.push({ x, y, vx: Math.cos(a) * rnd(120, 220), vy: Math.sin(a) * rnd(120, 220), star: true, c, life: 0.6, t0: G.t, r: 0, vr: 0, w: 4, h: 4 }); } }
function firework() { const x = rnd(W * 0.15, W * 0.85), y = rnd(H * 0.08, H * 0.3), c = `hsl(${rnd(0, 360)},90%,65%)`;
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, v = rnd(70, 130); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, star: true, c, life: 1.2, t0: G.t, r: 0, vr: 0, w: 3, h: 3, fw: true }); } }

// общие части сцен
const hype = () => G.phase === 'cheer' ? 1 : G.phase === 'end' ? 0.8 : 0.25;
function stands(y0, alpha = 0.55, color = '0,0,0') {                               // зрители: силуэты, при чир-моменте прыгают и машут
  const h = hype(), clap = G.mode === 'play' && G.cur === 'beat' && (G.phase === 'ready' || G.phase === 'charge') && TW.onBeat(G.t - G.beatT0);
  for (const p of crowd) { const y = y0 - p.row * 22 + Math.max(0, Math.sin(G.t * 6 + p.ph)) * 6 * h;
    cx.fillStyle = `rgba(${color},${alpha - p.row * 0.12})`; cx.beginPath(); cx.arc(p.x, y, 8, 0, 7); cx.fill(); cx.fillRect(p.x - 9, y + 6, 18, 30);
    if ((G.phase === 'cheer' || G.phase === 'end' || clap) && p.row === 0) { cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x + 9, y - 14 - Math.sin(G.t * 12 + p.ph) * 6, 4, 0, 7); cx.fill(); } }
}
function spots(cols, alpha = 0.32) {
  cx.save(); cx.globalCompositeOperation = 'lighter';
  cols.forEach((col, i) => { const sx = W * (0.1 + 0.8 * i / Math.max(1, cols.length - 1)), tx = GX + Math.sin(G.t * 0.7 + i * 2) * W * 0.35, gr = cx.createLinearGradient(sx, 0, tx, groundY);
    gr.addColorStop(0, `rgba(${col},${alpha})`); gr.addColorStop(1, `rgba(${col},0)`); cx.fillStyle = gr;
    cx.beginPath(); cx.moveTo(sx - 8, 0); cx.lineTo(sx + 8, 0); cx.lineTo(tx + 70, groundY); cx.lineTo(tx - 70, groundY); cx.closePath(); cx.fill(); });
  cx.restore();
}
function vgrad(stops, y0 = 0, y1 = H) { const g = cx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
function floor(stops) { cx.fillStyle = vgrad(stops, groundY, H); cx.fillRect(0, groundY, W, H - groundY); }
function arena(top, mid, bot, spotCols, floorCols) {
  cx.fillStyle = vgrad([top, mid, bot]); cx.fillRect(0, 0, W, H);
  stands(groundY - 100 * u); spots(spotCols); floor(floorCols);
}

const SCENES = {
  home: () => arena('#1b0840', '#3d1680', '#14062e', ['200,140,255', '255,120,220', '170,120,255'], ['#5a2aa8', '#2a0f5c']),
  gym() {                                                                             // спортзал: окна, шведские стенки, мат
    cx.fillStyle = vgrad(['#efe0c6', '#e0c9a4']); cx.fillRect(0, 0, W, groundY);
    for (let i = 0; i < 4; i++) { const x = W * (0.08 + i * 0.23), w = W * 0.17, y = H * 0.06, h = H * 0.2;
      cx.fillStyle = '#bfe3ff'; cx.fillRect(x, y, w, h); cx.strokeStyle = '#fff'; cx.lineWidth = 4; cx.strokeRect(x, y, w, h); cx.beginPath(); cx.moveTo(x + w / 2, y); cx.lineTo(x + w / 2, y + h); cx.moveTo(x, y + h / 2); cx.lineTo(x + w, y + h / 2); cx.stroke(); }
    cx.save(); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(255,250,220,.12)';
    for (let i = 0; i < 4; i++) { const x = W * (0.08 + i * 0.23); cx.beginPath(); cx.moveTo(x, H * 0.26); cx.lineTo(x + W * 0.17, H * 0.26); cx.lineTo(x + W * 0.3, groundY); cx.lineTo(x + W * 0.1, groundY); cx.fill(); } cx.restore();
    for (const x0 of [W * 0.02, W * 0.8]) { const w = W * 0.18, y0 = H * 0.34; cx.fillStyle = '#a8743f';
      for (const px of [0, w / 2, w]) cx.fillRect(x0 + px - 3, y0, 6, groundY - y0);
      for (let y = y0 + 12; y < groundY; y += 22) cx.fillRect(x0, y, w, 4); }
    cx.fillStyle = '#7c4dff'; cx.font = `900 ${Math.round(W * 0.06)}px -apple-system,sans-serif`; cx.textAlign = 'center'; cx.fillText('ТРЕНИРОВКА', W / 2, H * 0.32);
    floor(['#c98f55', '#a8703c']); cx.strokeStyle = 'rgba(90,50,20,.25)'; cx.lineWidth = 1; for (let y = groundY + 10; y < H; y += 14) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    cx.fillStyle = '#8a5cff'; cx.beginPath(); cx.ellipse(GX, groundY + 8, 70 * u, 9 * u, 0, 0, 7); cx.fill();
  },
  school() {                                                                          // школьная сцена: занавес, гирлянда, дети в зале
    cx.fillStyle = vgrad(['#2a0d52', '#4a1a7c']); cx.fillRect(0, 0, W, groundY);
    for (const [x0, dir] of [[0, 1], [W, -1]]) for (let i = 0; i < 6; i++) { cx.fillStyle = i % 2 ? '#8e1f6d' : '#a8287f'; cx.fillRect(x0 + dir * i * W * 0.035 - (dir < 0 ? W * 0.035 : 0), 0, W * 0.035, groundY); }
    cx.fillStyle = '#7a1660'; for (let x = 0; x < W; x += 40) { cx.beginPath(); cx.arc(x + 20, H * 0.03, 22, 0, Math.PI); cx.fill(); } cx.fillRect(0, 0, W, H * 0.03);
    cx.strokeStyle = '#3b2a1a'; cx.lineWidth = 2; cx.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H * 0.1 + Math.sin(x / W * Math.PI) * H * 0.05; x ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke();
    for (let x = 15, k = 0; x < W; x += 28, k++) { const y = H * 0.1 + Math.sin(x / W * Math.PI) * H * 0.05 + 6, on = Math.sin(G.t * 3 + k) > -0.3;
      cx.fillStyle = on ? ['#ff5fa8', '#ffc21a', '#5fe3a1', '#5f9dff', '#c9a6ff'][k % 5] : 'rgba(255,255,255,.2)'; cx.beginPath(); cx.arc(x, y, 5, 0, 7); cx.fill(); }
    spots(['255,200,240', '200,160,255'], 0.25);
    floor(['#8a5a32', '#5c3a1e']);
    for (let i = 0; i < Math.ceil(W / 26); i++) { cx.fillStyle = 'rgba(10,0,25,.85)'; const x = i * 26 + 13, y = H - 14 + Math.sin(G.t * 5 + i) * 2 * hype() * 4; cx.beginPath(); cx.arc(x, y, 11, 0, 7); cx.fill(); }
  },
  stadium() {                                                                         // стадион на закате: трибуны, прожекторы, флаги по ветру
    cx.fillStyle = vgrad(['#ff9a5a', '#d0569f', '#4a1b8c'], 0, H * 0.5); cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#ffd08a'; cx.beginPath(); cx.arc(W * 0.75, H * 0.36, 34, 0, 7); cx.fill();
    cx.fillStyle = '#2a1050'; cx.beginPath(); cx.moveTo(0, H * 0.4); cx.lineTo(W, H * 0.4); cx.lineTo(W, groundY); cx.lineTo(0, groundY); cx.fill();
    stands(groundY - 100 * u, 0.6, '20,5,45');
    for (let i = 0; i < 60; i++) { cx.fillStyle = `hsla(${i * 47 % 360},70%,65%,.7)`; cx.fillRect((i * 97) % W, H * 0.42 + (i * 31) % (H * 0.12), 3, 3); }
    for (const x of [W * 0.06, W * 0.94]) { cx.fillStyle = '#1a0a33'; cx.fillRect(x - 3, H * 0.12, 6, H * 0.3); cx.fillStyle = '#fff6d0'; cx.fillRect(x - 16, H * 0.1, 32, 12);
      cx.save(); cx.globalCompositeOperation = 'lighter'; const g = cx.createRadialGradient(x, H * 0.11, 2, x, H * 0.11, 90); g.addColorStop(0, 'rgba(255,240,200,.6)'); g.addColorStop(1, 'rgba(255,240,200,0)'); cx.fillStyle = g; cx.fillRect(x - 90, H * 0.11 - 90, 180, 180); cx.restore(); }
    const wd = Math.sign(G.wind || 1), ws = Math.min(1, Math.abs(G.wind) / (40 * u) + 0.3);       // флаги показывают ветер
    for (const [x, c] of [[W * 0.25, '#ff5fa8'], [W * 0.5, '#ffc21a'], [W * 0.75, '#5fe3a1']]) { const y = H * 0.36; cx.fillStyle = '#ddd'; cx.fillRect(x - 1.5, y, 3, H * 0.06);
      cx.fillStyle = c; cx.beginPath(); cx.moveTo(x, y); for (let k = 0; k <= 6; k++) cx.lineTo(x + wd * k * 6 * ws * 1.4, y + Math.sin(G.t * 8 + k) * 2 * ws); for (let k = 6; k >= 0; k--) cx.lineTo(x + wd * k * 6 * ws * 1.4, y + 14 + Math.sin(G.t * 8 + k) * 2 * ws); cx.fill(); }
    floor(['#b8473c', '#7e2a24']); cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2; for (const k of [0.25, 0.55, 0.85]) { cx.beginPath(); cx.moveTo(0, groundY + (H - groundY) * k); cx.lineTo(W, groundY + (H - groundY) * k); cx.stroke(); }
  },
  palace: () => arena('#0a1a3d', '#163a7a', '#081530', ['120,180,255', '200,140,255', '255,220,160'], ['#2a5aa8', '#0f2a5c']),
  russia() {                                                                          // арена Кубка: ленты-растяжки бело-сине-красные
    arena('#1a0c3a', '#2c1a6a', '#120830', ['255,230,200', '200,170,255', '255,200,220'], ['#4a2a8a', '#1e0f4a']);
    for (let i = 0; i < 9; i++) { const x = W * (i + 0.5) / 9, l = H * (0.16 + 0.05 * Math.sin(i * 1.7)); ['#ffffff', '#2f6bff', '#ff3b4a'].forEach((c, k) => { cx.fillStyle = c; cx.fillRect(x - 9 + k * 6, 0, 6, l - k * 6); }); }
  },
  ice() {                                                                             // ледовый дворец: голубой лёд, снежинки
    arena('#06203d', '#1d5a96', '#0a2a4a', ['200,240,255', '170,200,255', '230,250,255'], ['#cfeeff', '#7fb8e6']);
    cx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) { cx.fillRect(W * (i * 0.17 + 0.03), groundY + 6 + i * 5, W * 0.12, 2); }
    cx.fillStyle = '#fff'; for (const f of flakes) { const y = (f.y + G.t * f.v) % H, x = f.x + Math.sin(G.t + f.ph) * 10; cx.globalAlpha = 0.7; cx.beginPath(); cx.arc(x, y, f.r, 0, 7); cx.fill(); } cx.globalAlpha = 1;
  },
  world() {                                                                           // финал: ночное небо, фейерверки, флажки
    cx.fillStyle = vgrad(['#05021a', '#1d0a4a', '#3a1680'], 0, groundY); cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#fff'; for (const s of skyStars) { cx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(G.t * 2 + s.ph)); cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 7); cx.fill(); } cx.globalAlpha = 1;
    stands(groundY - 100 * u, 0.7, '15,5,40'); spots(['200,140,255', '255,210,120', '255,120,220'], 0.36);
    cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 1.5; cx.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H * 0.05 + Math.sin(x / W * Math.PI) * H * 0.04; x ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke();
    for (let x = 10, k = 0; x < W; x += 22, k++) { const y = H * 0.05 + Math.sin(x / W * Math.PI) * H * 0.04; cx.fillStyle = `hsl(${k * 40 % 360},85%,60%)`; cx.beginPath(); cx.moveTo(x - 8, y); cx.lineTo(x + 8, y); cx.lineTo(x, y + 16); cx.fill(); }
    floor(['#6a2bd9', '#2a0f5c']);
  },
};
function background() {
  SCENES[G.mode === 'play' ? LEVELS[G.L].scene : 'home']();
  const sp = cx.createRadialGradient(GX, groundY + 6, 4, GX, groundY + 6, 90 * u); sp.addColorStop(0, 'rgba(255,240,255,.4)'); sp.addColorStop(1, 'rgba(255,240,255,0)');
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
  cx.save(); cx.translate(gx, groundY - (P.jump || 0) * u + (P.squat || 0) * u); if (P.flip !== undefined) cx.scale(P.flip, 1);
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
  if (b.glow) { cx.shadowColor = b.glow; cx.shadowBlur = 16; }
  let gr = cx.createLinearGradient(-L, 0, L, 0);
  if (b.rainbow) ['#ff5f6d', '#ffc371', '#5fe3a1', '#5f9dff', '#b16bff'].forEach((c, i) => gr.addColorStop(i / 4, c)); else { gr.addColorStop(0, b.c[0]); gr.addColorStop(0.5, b.c[1]); gr.addColorStop(1, b.c[0]); }
  cx.strokeStyle = gr; cx.lineWidth = 2.6 * u; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(-L, 0); cx.lineTo(L, 0); cx.stroke();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.ellipse(L, 0, 3.6 * u, 3.2 * u, 0, 0, 7); cx.fill(); cx.beginPath(); cx.ellipse(-L, 0, 2.8 * u, 2.5 * u, 0, 0, 7); cx.fill();
  cx.restore();
}


// ─── игра ───
// fls — жезлы в воздухе (на «двух жезлах» их два): T, h, spins, t0, a0, x0, dx (снос ветром), done, dropAt, trick, beat
let fls = [], chargeT0 = 0, phaseT0 = 0, st = null, tutor = !ls('tw_tut'), gxTo = 0, spinT0 = -9;
const MECH = { none: '', star: '⭐ Добрось до звезды!', wind: '🌬️ Ветер! Нажми, куда падает жезл, — и беги', double: '✌️ Два жезла — поймай оба',
  trick: '🌀 Пока жезл высоко — нажми для пируэта', beat: '👏 Отпусти палец на хлопок' };
function startLevel(L) {
  G.mode = 'play'; G.L = L; G.beatT0 = G.t; gx = gxTo = GX; fls = [];
  st = { throws: LEVELS[L].throws, n: 0, hearts: 3, score: 0, combo: 0, streak: 0, perfect: 0, drops: 0, caught: 0, stars: 0 };
  ['levels', 'result', 'home'].forEach(id => $(id).hidden = true); $('sign').hidden = true; $('hud').hidden = false;
  nextThrow(); setPhase('intro'); hud();
  const l = LEVELS[L]; $('iIcon').textContent = l.icon; $('iTitle').textContent = `${L + 1}. ${l.n}`; $('iText').textContent = l.about; $('intro').hidden = false;
}
$('iGo').onclick = () => { $('intro').hidden = true; audio(); setPhase('ready'); };
function nextThrow() {                                                               // фишка этого броска: звезда на высоте, сила ветра
  const m = LEVELS[G.L].mech; G.cur = m === 'mix' ? TW.MIX[Math.floor(Math.random() * TW.MIX.length)] : m;
  G.star = rnd(0.45, 0.95); G.wind = G.cur === 'wind' ? (Math.random() < 0.5 ? -1 : 1) * rnd(22, 42) * u : 0; gxTo = GX;
}
function setPhase(p) { G.phase = p; phaseT0 = G.t; }
function hud() {
  $('hLvl').querySelector('b').textContent = LEVELS[G.L].n;
  $('hLvl').querySelector('small').textContent = `Бросок ${Math.min(st.n + (G.phase === 'ready' || G.phase === 'charge' || G.phase === 'intro' ? 1 : 0), st.throws)} из ${st.throws} · ${'❤️'.repeat(Math.max(0, st.hearts))}${'🤍'.repeat(3 - Math.max(0, st.hearts))}`;
  $('hScore').innerHTML = `${st.score}<small>${st.combo > 1 ? `серия ×${st.combo}` : '&nbsp;'}</small>`;
}
const hmax = () => hand().y - H * 0.13;
function throwIt() {
  const power = Math.min(1, (G.t - chargeT0) / 0.9), f = TW.flight(power, G.L), h = hand(), beat = G.cur === 'beat' && TW.onBeat(G.t - G.beatT0);
  const one = (ff, hk, extra = {}) => ({ ...ff, hk, h: hmax() * hk, t0: G.t, a0: (G.t * 9) % (Math.PI * 2), x0: h.x, dx: G.wind, done: false, beat, ...extra });
  fls = [one(f, f.hk)];
  if (G.cur === 'double') { const T2 = f.T * 1.35; fls.push(one({ ...f, T: T2, spins: Math.max(1, Math.round(LEVELS[G.L].spin * T2)) }, Math.min(1, f.hk * 1.25), { a0: 1.2 })); }
  if (G.cur === 'star') fls[0].starCheck = true;
  if (beat) pop('В такт! 👏', h.x, h.y - 40 * u, '#c9a6ff', 26); else if (G.cur === 'beat') pop('Мимо такта', h.x, h.y - 40 * u, '#ddd', 18);
  st.n++; sWhoosh(power); setPhase('fly'); hud();
}
const bx = f => f.x0 + f.dx * Math.min((G.t - f.t0) / f.T, 1.3);                   // жезл сносит ветром (упавший дальше не едет)
function tap(x) {
  const live = fls.filter(f => !f.done), [, gw] = LEVELS[G.L].win;
  const near = live.map(f => ({ f, e: G.t - f.t0 - f.T })).filter(o => o.e > -0.4).sort((a, b) => Math.abs(a.e) - Math.abs(b.e))[0];
  const runTo = () => { gxTo = Math.max(30 * u, Math.min(W - 40 * u, x - 18 * u)); };
  if (!near) {                                                                        // жезл ещё высоко: пируэт, бег под жезл или «ещё рано»
    const s = live.length ? (G.t - live[0].t0) / live[0].T : 0;
    if (G.cur === 'trick' && !live[0].trick && s > 0.08 && s < 0.75) { live.forEach(f => f.trick = true); spinT0 = G.t; noise(0.4, 800, 3000, 0.15); pop('Пируэт! 🌀', gx, groundY - 110 * u, '#c9a6ff', 26); return; }
    if (G.cur === 'wind') { runTo(); return; }
    pop('Ещё рано!', W / 2, H * 0.3, '#e6d9ff', 22); return;
  }
  const f = near.f, h = hand();
  if (G.cur === 'wind' && !TW.under(h.x, bx(f), u) && Math.abs(near.e) <= gw) { runTo(); return; }   // не под жезлом — сначала добеги
  const g = TW.grade(near.e, G.L);
  if (g === 'miss') { if (G.cur === 'wind' && near.e < 0) { runTo(); return; } drop(f, near.e < 0 ? 'Рано!' : 'Поздно!'); return; }
  const mult = (f.trick ? 2 : 1) * (f.beat ? 1.5 : 1), pts = Math.round(TW.points(f.spins, g, st.combo) * mult);
  st.score += pts; st.combo++; st.caught++; if (g === 'perfect') st.perfect++;
  pop(g === 'perfect' ? 'Идеально!' : 'Хорошо!', h.x, h.y - 50 * u, g === 'perfect' ? '#ffe066' : '#c9a6ff', g === 'perfect' ? 34 : 28);
  pop(`+${pts}${mult > 1 ? ` (×${mult})` : ''} · ${f.spins} ${f.spins === 1 ? 'оборот' : f.spins < 5 ? 'оборота' : 'оборотов'}`, h.x, h.y - 25 * u, '#fff', 18);
  sCatch(g); sparkle(h.x, h.y); if (g === 'perfect') confetti(h.x, h.y, 16, 0.6);
  f.done = true; f.ok = true; resolve();
  if (tutor) { tutor = false; ls('tw_tut', 1); }
}
function drop(f, why) {
  st.hearts--; st.drops++; st.combo = 0; sDrop(); pop(why + ' Уронила…', W / 2, H * 0.32, '#ff9fb3', 26);
  f.done = true; f.dropAt = G.t; resolve();
}
function resolve() {                                                                 // бросок закончен, когда все жезлы пойманы или упали
  hud(); if (fls.some(f => !f.done)) return;
  const ok = fls.every(f => f.ok); if (ok) st.streak = Math.max(0, st.streak) + 1; else st.streak = 0;
  setPhase(ok ? 'catch' : 'drop');
}
function afterThrow() {                                                              // что дальше: чир-момент, следующий бросок или конец
  const wasCatch = G.phase === 'catch'; fls = [];
  if (st.hearts <= 0 || st.n >= st.throws) return finish();
  nextThrow();
  if (wasCatch && st.streak > 0 && st.streak % 3 === 0) { st.cheerTaps = 0; setPhase('cheer'); sCrowd(0.25, 2); pop('Чир-момент! Жми быстро!', W / 2, H * 0.28, '#ffc21a', 30); return; }
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
    $('rText').innerHTML = `Очки: <b>${st.score}</b> · поймано ${st.caught}, идеально ${st.perfect}${st.stars ? `, звёзд над сценой ${st.stars}` : ''}<br>+${gained} ⭐ в копилку`
      + (m === 'gold' ? '' : m ? '<br>Для золота: без падений и половина бросков — идеально' : '<br>Попробуй бросать пониже — так легче поймать');
    const next = m && L < LEVELS.length - 1;
    $('rNext').textContent = next ? 'Следующее выступление ▶' : 'Ещё раз'; $('rNext').dataset.l = next ? L + 1 : L; $('rAgain').hidden = !next;
    $('result').hidden = false;
  }, m ? 900 : 600);
}

// ─── касания ───
cv.addEventListener('pointerdown', e => {
  if (G.mode !== 'play') return; e.preventDefault();
  if (G.phase === 'ready') { chargeT0 = G.t; setPhase('charge'); }
  else if (G.phase === 'fly') tap(e.clientX);
  else if (G.phase === 'cheer') { st.cheerTaps++; st.score += 30; sShake(); if (st.cheerTaps % 5 === 0) sparkle(gx + rnd(-60, 60), groundY - rnd(60, 110) * u, 6); hud(); }
});
addEventListener('pointerup', () => { if (G.mode === 'play' && G.phase === 'charge') throwIt(); });
addEventListener('pointercancel', () => { if (G.mode === 'play' && G.phase === 'charge') throwIt(); });

// ─── кадр ───
let last = performance.now(), lastBeat = 0, fwT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt;
  if (G.mode === 'play' && LEVELS[G.L].scene === 'world' && G.t > fwT) { firework(); fwT = G.t + 1.3; }
  // хлопки зала на «ритме»
  if (G.mode === 'play' && G.cur === 'beat' && (G.phase === 'ready' || G.phase === 'charge')) { const b = Math.floor((G.t - G.beatT0) / TW.BEAT); if (b !== lastBeat) { lastBeat = b; noise(0.08, 1500, 2500, 0.2); } }
  gx += Math.sign(gxTo - gx) * Math.min(Math.abs(gxTo - gx), 420 * dt);              // бег под жезл
  background();
  const h = hand(); let pose = { arm: 1 }, showBaton = true, inHand = true;
  if (G.mode === 'home') pose = { arm: 1, jump: Math.max(0, Math.sin(G.t * 2.4)) * 3, happy: Math.sin(G.t * 0.5) > 0.6 };
  else if (G.phase === 'charge') pose = { arm: 1, squat: 3 * Math.min(1, (G.t - chargeT0) / 0.9) };
  else if (G.phase === 'fly' || G.phase === 'drop') {
    inHand = false; const [, gw] = LEVELS[G.L].win;
    for (const f of fls) {
      const s = (G.t - f.t0) / f.T, x = bx(f); let y = h.y - f.h * 4 * s * (1 - s), a = f.a0 + Math.PI * 2 * f.spins * s;
      if (f.starCheck && s >= 0.5) { f.starCheck = false; if (TW.starHit(f.hk, G.star)) { st.stars++; st.score += 250; sparkle(x, hand().y - hmax() * G.star, 18, '#ffe066'); bell(1318.5, 0, 0.8, 0.1); pop('Звезда! +250', x, hand().y - hmax() * G.star + 30, '#ffe066', 24); hud(); } else pop(f.hk < G.star ? 'Выше!' : 'Ниже!', x + 40, hand().y - hmax() * G.star, '#fff', 18); }
      if (!f.done && G.t - f.t0 > f.T + gw) drop(f, 'Поздно!');
      if (f.ok) continue;                                                            // пойманный — в руке
      if (y > groundY - 3 * u) { y = groundY - 3 * u - Math.abs(Math.sin((G.t - (f.dropAt || G.t)) * 12)) * 8 * Math.max(0, 1 - (G.t - (f.dropAt || G.t))); a = 0.15; }
      else for (const k of [1, 2]) baton(x, y + k * 6, a - k * 0.35, 0.18);          // след вращения
      baton(x, y, a);
    }
    inHand = fls.some(f => f.ok);
    const s0 = fls[0] ? (G.t - fls[0].t0) / fls[0].T : 1;
    pose = G.phase === 'drop' ? { arm: 0.6, sad: true } : { arm: Math.min(1, s0 * 1.5) };
    if (G.phase === 'drop' && G.t - phaseT0 > 1.1) afterThrow();
  }
  else if (G.phase === 'catch') { const k = G.t - phaseT0; pose = { arm: 1, squat: Math.sin(Math.min(1, k / 0.4) * Math.PI) * 3, happy: true }; if (k > 0.5) afterThrow(); }
  else if (G.phase === 'cheer') { showBaton = false; pose = { cheer: true, jump: Math.abs(Math.sin(G.t * 9)) * 6, happy: true }; if (G.t - phaseT0 > 4) { pop(`+${st.cheerTaps * 30} за помпоны!`, W / 2, H * 0.3, '#ffc21a', 26); setPhase('ready'); hud(); } }
  else if (G.phase === 'end') pose = { arm: 1, jump: Math.abs(Math.sin(G.t * 5)) * 4, happy: true };
  if (G.t - spinT0 < 0.6) { pose.flip = Math.cos((G.t - spinT0) / 0.6 * Math.PI * 4); pose.jump = (pose.jump || 0) + Math.sin((G.t - spinT0) / 0.6 * Math.PI) * 10; }
  // звезда над сценой
  if (G.mode === 'play' && G.cur === 'star' && ['ready', 'charge', 'fly'].includes(G.phase)) { const sy = hand().y - hmax() * G.star; text('⭐', hand().x, sy, '#fff', 30); cx.setLineDash([4, 6]); cx.strokeStyle = 'rgba(255,224,102,.35)'; cx.beginPath(); cx.moveTo(hand().x - 40, sy); cx.lineTo(hand().x + 40, sy); cx.stroke(); cx.setLineDash([]); }
  girl(pose);
  if (showBaton && inHand) baton(hand().x, hand().y, G.phase === 'charge' ? G.t * (9 + 25 * Math.min(1, (G.t - chargeT0) / 0.9)) : G.t * (G.mode === 'home' ? 7 : 9));
  // круг ловли, сила броска, такт
  if (G.mode === 'play' && ['fly', 'charge', 'ready'].includes(G.phase)) {
    const hh = hand(), near = fls.some(f => !f.done && Math.abs(G.t - f.t0 - f.T) <= LEVELS[G.L].win[1]);
    cx.strokeStyle = near ? 'rgba(255,224,102,.95)' : `rgba(255,255,255,${G.phase === 'fly' ? 0.35 + 0.25 * Math.sin(G.t * 10) : 0.25})`;
    cx.lineWidth = near ? 5 : 3; cx.beginPath(); cx.arc(hh.x, hh.y, 17 * u, 0, 7); cx.stroke();
    if (G.phase === 'charge') { const p = Math.min(1, (G.t - chargeT0) / 0.9); cx.strokeStyle = `hsl(${280 - 60 * p},90%,65%)`; cx.lineWidth = 7; cx.beginPath(); cx.arc(hh.x, hh.y, 24 * u, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); cx.stroke(); }
    if (G.cur === 'beat' && G.phase !== 'fly') { const ph = ((G.t - G.beatT0) % TW.BEAT) / TW.BEAT, k = Math.max(0, 1 - ph * 3); cx.strokeStyle = `rgba(201,166,255,${0.25 + 0.7 * k})`; cx.lineWidth = 3 + 5 * k; cx.beginPath(); cx.ellipse(gx, groundY + 4, (40 + 25 * k) * u, (7 + 4 * k) * u, 0, 0, 7); cx.stroke(); }
    if (G.cur === 'wind' && G.phase !== 'fly') text(G.wind > 0 ? '🌬️ ➜' : '⬅ 🌬️', W / 2, H * 0.22, '#fff', 26);
  }
  if (G.mode === 'play' && G.phase === 'cheer') { const k = 1 - (G.t - phaseT0) / 4; cx.fillStyle = 'rgba(255,255,255,.2)'; cx.fillRect(W * 0.15, H * 0.2, W * 0.7, 10); cx.fillStyle = '#ffc21a'; cx.fillRect(W * 0.15, H * 0.2, W * 0.7 * k, 10);
    text(`${st.cheerTaps}`, W / 2, H * 0.2 + 52, '#fff', 40); }
  if (G.mode === 'play' && (G.phase === 'ready' || G.phase === 'charge')) {
    if (MECH[G.cur]) text((LEVELS[G.L].mech === 'mix' ? 'Сейчас: ' : '') + MECH[G.cur], W / 2, H * 0.16, '#e6d9ff', 16, W * 0.9);
    if (tutor) text('Держи палец на экране — это сила броска. Отпусти — бросок!', W / 2, H * 0.36, '#fff', 17, W * 0.85);
  }
  if (G.mode === 'play' && tutor && G.phase === 'fly') text('Нажми, когда жезл упадёт в круг!', W / 2, H * 0.36, '#ffe066', 19, W * 0.85);
  // частицы и надписи
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i], k = G.t - p.t0; if (k > p.life) { parts.splice(i, 1); continue; }
    const x = p.x + p.vx * k, y = p.y + p.vy * k + (p.star ? (p.fw ? 40 * k * k : 0) : 700 * k * k); cx.globalAlpha = Math.max(0, 1 - k / p.life); cx.fillStyle = p.c;
    if (p.star) { cx.beginPath(); cx.arc(x, y, p.fw ? 2.5 : 3, 0, 7); cx.fill(); } else { cx.save(); cx.translate(x, y); cx.rotate(p.r + p.vr * k); cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore(); } }
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
  G.mode = 'home'; fls = []; gx = gxTo = GX; $('hud').hidden = true; $('intro').hidden = true; $('home').hidden = false; $('sign').hidden = false;
  $('hello').textContent = name() ? `Привет, ${name()}! 💜` : '';
  $('bdayBadge').hidden = ls('tw_bday') !== today();
  $('homeStars').textContent = `⭐ ${starsN}`;
  $('sndBtn').textContent = soundOn() ? '🔊 Звук' : '🔇 Без звука';
}
function levels() {
  const u0 = unlocked();
  $('lvList').innerHTML = LEVELS.map((l, i) => `<button class="lv" data-l="${i}" ${i > u0 ? 'disabled' : ''}><div>${l.icon} ${i + 1}. ${l.n}<small>${l.throws} бросков${best[i] ? ` · рекорд ${best[i]}` : ''}</small></div><span>${i > u0 ? '🔒' : { gold: '🥇', silver: '🥈', bronze: '🥉' }[medals[i]] || '▶'}</span></button>`).join('');
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
  $('items').innerHTML = SHOP[tab].map(x => { const has = owned[tab].includes(x.id) || x.gift, on = wear[tab] === x.id;
    const sw = x.id === 'crown' ? 'background:linear-gradient(#ffe27a,#f0a800)' : x.rainbow || x.c?.length > 2 ? 'background:linear-gradient(90deg,#ff5f6d,#ffc371,#5fe3a1,#5f9dff,#b16bff)' : `background:linear-gradient(135deg,${x.c[0]},${x.c[x.c.length - 1]})`;
    return `<button class="it ${on ? 'on' : ''} ${!has && x.price > starsN ? 'no' : ''}" data-i="${x.id}"><i style="${sw}"></i>${esc(x.n)}<span>${on ? 'надето ✓' : has ? (x.gift && !owned[tab].includes(x.id) ? '🎁 подарок' : 'надеть') : `⭐ ${x.price}`}</span></button>`; }).join('');
  $('shop').hidden = false; $('home').hidden = true;
}
$('tabs').onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; shop(); } };
$('items').onclick = e => {
  const b = e.target.closest('.it'); if (!b) return; const x = SHOP[tab].find(i => i.id === b.dataset.i);
  if (!owned[tab].includes(x.id)) { if (!x.gift && x.price > starsN) return; if (!x.gift) { starsN -= x.price; bell(880, 0, 0.6, 0.1); } owned[tab].push(x.id); }
  wear[tab] = tab === 'extra' && wear.extra === x.id ? '' : x.id; saveAll(); shop();                // корону можно снять
};
$('shopBtn').onclick = () => { audio(); shop(); };
$('shopClose').onclick = () => { $('shop').hidden = true; home(); };

// ─── подарки: имя и поздравление при первом запуске (имя хранится только на телефоне), фиолетовый набор ───
function violet() {                                                                  // любимый цвет — фиолетовый: костюм, жезл, помпоны
  for (const [k, id] of [['costume', 'vstar'], ['baton', 'amethyst'], ['pompom', 'lavender']]) { if (!owned[k].includes(id)) owned[k].push(id); wear[k] = id; }
  ls('tw_violet', 1); saveAll();
}
function birthday() {
  for (const k of ['baton', 'extra']) { const id = k === 'baton' ? 'gold' : 'crown'; if (!owned[k].includes(id)) owned[k].push(id); }
  wear.extra = 'crown'; violet();
  $('bdayTitle').textContent = name() ? `С днём рождения, ${name()}!` : 'С днём рождения!';
  $('bday').hidden = false; audio(); sBirthday(); confetti(W / 2, H * 0.3, 120, 1.3);
}
$('nameOk').onclick = () => { const n = $('nameIn').value.trim().slice(0, 16); ls('tw_name', n); ls('tw_bday', today()); ls('tw_bdayShown', String(new Date().getFullYear()) + today()); $('nameCard').hidden = true; home(); birthday(); };
$('bdayOk').onclick = () => { $('bday').hidden = true; confetti(W / 2, H * 0.4, 60); home(); };
$('giftOk').onclick = () => { $('gift').hidden = true; violet(); confetti(W / 2, H * 0.4, 80); bell(783.99, 0, 1, 0.1); home(); };

resize(); home();
if (!ls('tw_bday')) $('nameCard').hidden = false;
else if (ls('tw_bday') === today() && ls('tw_bdayShown') !== String(new Date().getFullYear()) + today()) { ls('tw_bdayShown', String(new Date().getFullYear()) + today()); setTimeout(birthday, 400); }
else if (!ls('tw_violet')) setTimeout(() => { $('gift').hidden = false; }, 500);
requestAnimationFrame(frame);
if (/[?&]debug/.test(location.search)) window.TT = { G, st: () => st, fls: () => fls, startLevel, tap, hand, gx: () => gx, frame };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
