#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/core.js'), 'utf8');
const key = 'sonicpang.save.v1';
const names = ['ADOLFO', 'SAMCR0', 'CANK.INC', 'NORDIX-TRAX', 'STATUS-X', 'ELBRUJO', 'RED-POINT', 'MEGABYTE'];

function storage(data) {
  const values = new Map(data ? [[key, JSON.stringify(data)]] : []);
  return { getItem: k => values.get(k) || null, setItem: (k, value) => values.set(k, value) };
}
function open(localStorage) {
  const context = vm.createContext({ localStorage });
  vm.runInContext(source, context);
  const store = context.SP.store;
  store.load();
  return store;
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function legacy(personal) {
  const seeds = Array.from({ length: 10 - personal.length }, (_, i) => ({
    name: 'OLD' + i, score: 60000 - i * 5000, stage: '6-5', cpu: true
  }));
  return {
    opts: { music: 0.3, sfx: 0.6, shake: false, scanlines: false },
    scores: { story: personal.concat(seeds), endless: personal.concat(seeds) },
    unlocked: 4, seenStory: true, cleared: false, stats: { pops: 123, games: 9 }
  };
}

// Un navegador nuevo recibe los ocho apodos completos en ambas tablas.
const fresh = open(storage());
for (const mode of ['story', 'endless']) {
  assert.deepEqual(plain(fresh.data.scores[mode].map(e => e.name)), names);
  assert(fresh.data.scores[mode].every(e => e.cpu && e.score > 0 && e.score <= 5000));
  assert(fresh.data.scores[mode].every((e, i, list) => !i || list[i - 1].score > e.score));
}
assert.equal(fresh.data.opts.scanlines, true);

// Los navegadores que ya guardaron la primera lista reciben el orden inverso.
const previousOrder = plain(fresh.data);
previousOrder.scoreDefaultsVersion = 1;
for (const mode of ['story', 'endless']) {
  previousOrder.scores[mode].forEach((entry, i) => { entry.name = names[names.length - 1 - i]; });
}
const reordered = open(storage(previousOrder));
for (const mode of ['story', 'endless']) assert.deepEqual(plain(reordered.data.scores[mode].map(e => e.name)), names);

// La actualización conserva todas las marcas personales, incluso las más bajas.
for (const count of [0, 2, 9, 10]) {
  const personal = Array.from({ length: count }, (_, i) => ({ name: 'PLAYER' + i, score: 100 + i * 100, stage: '1-1' }));
  const previous = legacy(personal), saved = storage(previous), store = open(saved);
  for (const mode of ['story', 'endless']) {
    const list = plain(store.data.scores[mode]);
    assert.equal(list.length, count + Math.min(8, 10 - count));
    assert(!list.some(e => e.name.startsWith('OLD')));
    for (const entry of personal) assert.deepEqual(list.find(e => e.name === entry.name), entry);
    assert(list.every((e, i) => !i || list[i - 1].score >= e.score));
  }
  assert.deepEqual(plain(store.data.opts), previous.opts);
  assert.deepEqual(plain(store.data.stats), previous.stats);
  assert.equal(store.data.unlocked, 4);
  assert.equal(store.data.seenStory, true);
  const persisted = JSON.parse(saved.getItem(key));
  assert.deepEqual(persisted, plain(store.data));
  assert.deepEqual(plain(open(saved).data), persisted);
}

// Al superar las marcas y recargar, los récords de muestra no reaparecen.
const saved = storage(), playing = open(saved);
for (let i = 0; i < 4; i++) playing.addScore('story', { name: 'WINNER' + i, score: 10000 + i * 1000, stage: '1-3' });
const earned = plain(playing.data.scores.story);
assert.equal(earned.length, 10);
assert(!earned.some(e => e.name === 'MEGABYTE'));
const reopened = open(saved);
assert.deepEqual(plain(reopened.data.scores.story), earned);

// El restablecimiento explícito también utiliza la nueva tabla y se guarda.
reopened.resetScores();
const reset = open(saved);
for (const mode of ['story', 'endless']) assert.deepEqual(plain(reset.data.scores[mode].map(e => e.name)), names);

console.log('✓ Récords iniciales, migración sin pérdida de marcas personales, persistencia y restablecimiento');
