'use strict';
// Звезда твирлинга — правила (без отрисовки, проверяются в node: selfcheck.js).
// Бросок: сила 0…1 (сколько держала палец) → время полёта T, высота, обороты. Ловля: ошибка по времени → идеально / хорошо / мимо.
(() => {
// Выступления: чем дальше, тем больше бросков, быстрее вращение и уже окно ловли [идеально, хорошо] в секундах.
// У каждого — своя сцена (scene) и фишка (mech): star — добрось до звезды, wind — ветер сносит жезл, double — два жезла,
// trick — пируэт, пока жезл высоко, beat — бросок в такт хлопкам, mix — каждый бросок своя фишка.
const LEVELS = [
  { n: 'Тренировка в зале', throws: 6, spin: 2.0, win: [0.10, 0.20], scene: 'gym', mech: 'none', icon: '🏋️',
    about: 'Разминка: держи палец — сила броска, отпусти — бросок. Нажми, когда жезл падает в круг у руки.' },
  { n: 'Школьный праздник', throws: 7, spin: 2.3, win: [0.09, 0.19], scene: 'school', mech: 'star', icon: '🎒',
    about: 'Над сценой висит звезда. Подбрось жезл так, чтобы он долетел до неё, — получишь бонус ⭐. Держи палец дольше, чтобы бросить выше.' },
  { n: 'Городской турнир', throws: 8, spin: 2.6, win: [0.085, 0.18], scene: 'stadium', mech: 'wind', icon: '🌬️',
    about: 'На стадионе ветер — флаги покажут, куда сносит жезл. Нажми туда, куда он падает, — и беги ловить! Поймать можно, только стоя под жезлом.' },
  { n: 'Первенство области', throws: 8, spin: 2.9, win: [0.08, 0.17], scene: 'palace', mech: 'double', icon: '✌️',
    about: 'Два жезла сразу! Они взлетают вместе, но падают по очереди. Поймай каждый — нажми два раза.' },
  { n: 'Кубок России', throws: 9, spin: 3.2, win: [0.07, 0.155], scene: 'russia', mech: 'trick', icon: '🌀',
    about: 'Пока жезл высоко, нажми — и сделай пируэт! Потом успей поймать: пируэт + ловля = очки ×2.' },
  { n: 'Чемпионат Европы', throws: 10, spin: 3.5, win: [0.065, 0.14], scene: 'ice', mech: 'beat', icon: '👏',
    about: 'Зал хлопает в ритм. Отпусти палец ровно на хлопок — бросок «в такт» даёт очки ×1,5.' },
  { n: 'Чемпионат мира', throws: 12, spin: 3.8, win: [0.06, 0.13], scene: 'world', mech: 'mix', icon: '🏆',
    about: 'Финал! Каждый бросок — своя фишка: звезда, ветер, два жезла, пируэт или ритм. Смотри подсказку перед броском.' },
];
const MIX = ['star', 'wind', 'double', 'trick', 'beat', 'none'];
const BEAT = 0.6;                                                                     // хлопок зала каждые 0,6 с (100 ударов в минуту)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function flight(power, L) {                                                         // T — секунды до возврата к руке, hk — доля максимальной высоты
  const p = clamp(power, 0, 1), T = 1.0 + 1.4 * p;
  return { T, hk: 0.3 + 0.7 * p, spins: Math.max(1, Math.round(LEVELS[L].spin * T)) };
}
function grade(err, L) { const [pw, gw] = LEVELS[L].win, a = Math.abs(err); return a <= pw ? 'perfect' : a <= gw ? 'good' : 'miss'; }
const points = (spins, g, combo) => g === 'miss' ? 0 : Math.round(100 * spins * (g === 'perfect' ? 1.5 : 1) * (1 + 0.1 * Math.min(combo, 10)));
// Медаль за чистоту: золото — без падений и половина идеальных; серебро — не больше одного падения; бронза — дошла до конца
function medal(st) {
  if (st.drops >= 3) return null;
  if (st.drops === 0 && st.perfect * 2 >= st.throws) return 'gold';
  return st.drops <= 1 ? 'silver' : 'bronze';
}
const stars = score => Math.round(score / 100);
// Фишки: звезда поймана, если вершина броска (доля высоты hk) рядом со звездой; ловля на ветру — только под жезлом; бросок в такт
const starHit = (hk, target) => Math.abs(hk - target) <= 0.09;
const under = (handX, batonX, u) => Math.abs(handX - batonX) <= 16 * u;
const onBeat = (t, period = BEAT) => { const ph = ((t % period) + period) % period; return Math.min(ph, period - ph) <= 0.09; };
// Гардероб: цена в звёздах; gift — подарок на день рождения
const SHOP = {
  costume: [{ id: 'vstar', n: 'Фиолетовая звезда', c: ['#5b21d6', '#c9a6ff'], price: 0, gift: true, sparkle: true }, { id: 'pink', n: 'Розовый', c: ['#ff4f9a', '#ffb0d2'], price: 0 }, { id: 'mint', n: 'Мятный', c: ['#17c3a3', '#a6f5e6'], price: 40 },
    { id: 'violet', n: 'Фиолетовый', c: ['#7c4dff', '#cbb8ff'], price: 80 }, { id: 'gold', n: 'Золотой', c: ['#f0a800', '#ffe27a'], price: 120 },
    { id: 'night', n: 'Звёздная ночь', c: ['#1d3a8f', '#6fa8ff'], price: 160, sparkle: true }, { id: 'rainbow', n: 'Радуга', c: ['#ff5f6d', '#ffc371'], price: 220, rainbow: true }],
  baton: [{ id: 'amethyst', n: 'Аметистовый', c: ['#7b2ff7', '#ead9ff'], price: 0, gift: true, glow: '#b07cff' }, { id: 'silver', n: 'Серебряный', c: ['#aeb9c8', '#ffffff'], price: 0 }, { id: 'gold', n: 'Золотой', c: ['#e0a100', '#fff3a8'], price: 0, gift: true },
    { id: 'pink', n: 'Розовый', c: ['#ff3d8b', '#ffd0e4'], price: 50 }, { id: 'rainbow', n: 'Радужный', c: ['#ff5f6d', '#5f9dff'], price: 100, rainbow: true },
    { id: 'glow', n: 'Светящийся', c: ['#38e8ff', '#ffffff'], price: 150, glow: '#38e8ff' }],
  pompom: [{ id: 'lavender', n: 'Лавандовые', c: ['#a77bff', '#d9c6ff'], price: 0, gift: true }, { id: 'pink', n: 'Розовые', c: ['#ff5fa8'], price: 0 }, { id: 'blue', n: 'Голубые', c: ['#3fb0ff'], price: 30 },
    { id: 'gold', n: 'Золотые', c: ['#ffc21a'], price: 60 }, { id: 'rainbow', n: 'Радужные', c: ['#ff5f6d', '#ffc371', '#5fe3a1', '#5f9dff', '#b16bff'], price: 90 },
    { id: 'silver', n: 'Серебряные', c: ['#dfe7f2', '#ffffff'], price: 120 }],
  extra: [{ id: 'crown', n: 'Корона именинницы', price: 0, gift: true }],
};
globalThis.TW = { LEVELS, MIX, BEAT, flight, grade, points, medal, stars, starHit, under, onBeat, SHOP };
})();
