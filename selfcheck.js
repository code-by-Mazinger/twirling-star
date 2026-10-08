// node selfcheck.js — правила бросков и ловли, медали, гардероб
'use strict';
const assert = require('assert');
require('./logic.js');
const { LEVELS, flight, grade, points, medal, stars, SHOP } = TW;
// дальше — сложнее: окно уже, вращение быстрее, бросков больше
for (let i = 1; i < LEVELS.length; i++) {
  const a = LEVELS[i - 1], b = LEVELS[i];
  assert(b.win[0] <= a.win[0] && b.win[1] <= a.win[1] && b.spin > a.spin && b.throws >= a.throws, 'уровень ' + (i + 1) + ' сложнее');
  assert(b.win[0] < b.win[1], 'идеально уже, чем хорошо');
}
// бросок: сильнее — дольше и больше оборотов; сила вне 0…1 обрезается
assert(flight(1, 0).T > flight(0, 0).T && flight(1, 0).spins >= flight(0, 0).spins);
assert.deepStrictEqual(flight(5, 0), flight(1, 0)); assert.deepStrictEqual(flight(-1, 0), flight(0, 0));
assert(flight(0, 0).spins >= 1);
// ловля: границы окон включительно
assert.strictEqual(grade(0.10, 0), 'perfect'); assert.strictEqual(grade(-0.15, 0), 'good'); assert.strictEqual(grade(0.21, 0), 'miss');
assert.strictEqual(grade(0.07, 6), 'good');
// очки: идеально больше хорошо, серия добавляет, мимо — ноль
assert(points(3, 'perfect', 0) > points(3, 'good', 0) && points(3, 'good', 5) > points(3, 'good', 0) && points(5, 'miss', 3) === 0);
assert.strictEqual(points(3, 'good', 30), points(3, 'good', 10), 'множитель серии ограничен');
// медали
assert.strictEqual(medal({ throws: 6, perfect: 3, drops: 0 }), 'gold');
assert.strictEqual(medal({ throws: 6, perfect: 2, drops: 0 }), 'silver');
assert.strictEqual(medal({ throws: 6, perfect: 6, drops: 1 }), 'silver');
assert.strictEqual(medal({ throws: 6, perfect: 0, drops: 2 }), 'bronze');
assert.strictEqual(medal({ throws: 6, perfect: 0, drops: 3 }), null);
assert.strictEqual(stars(2549), 25);
// гардероб: в каждом разделе есть бесплатная вещь, цены растут, id не повторяются
for (const [k, list] of Object.entries(SHOP)) {
  assert(list.some(x => x.price === 0), k + ': есть бесплатная');
  const paid = list.filter(x => !x.gift).map(x => x.price); assert(paid.every((p, i) => !i || p >= paid[i - 1]), k + ': цены по возрастанию');
  assert.strictEqual(new Set(list.map(x => x.id)).size, list.length, k + ': id без повторов');
}
console.log('ВСЁ ОК');
