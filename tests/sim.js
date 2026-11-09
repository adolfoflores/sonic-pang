#!/usr/bin/env node
/* =========================================================
   SONIC PANG — simulación sin pantalla
   Un bot juega los 30 niveles para comprobar que todos se
   pueden terminar a tiempo, que ninguna bola se queda atorada
   y que la lógica no lanza errores. También prueba el modo
   sin fin durante varios minutos simulados.

   Uso:  node tests/sim.js            (bot invencible)
         node tests/sim.js --mortal   (el bot puede morir)
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = globalThis;
const root = path.join(__dirname, '..', 'js');
['core.js', 'audio.js', 'music.js', 'gfx.js', 'sprites.js', 'backgrounds.js', 'levels.js', 'entities.js', 'game.js']
  .forEach((f) => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }));

const SP = global.SP;
const mortal = process.argv.includes('--mortal');
SP.debug = { god: !mortal };
const DT = 1 / 120;
const PF = SP.PF;

function blockedBelow(game, x, y) {
  for (const b of game.blocks) {
    if (b.dead || b.type !== 'solid') continue;
    if (x >= b.x - 2 && x <= b.x + b.w + 2 && b.y + b.h < PF.b - 40 && b.y + b.h > y) return true;
  }
  return false;
}

// Distancia mínima prevista entre el jugador y las bolas en los próximos 0.7 s
function safety(game, a) {
  const p = game.player, E = SP.ent;
  let worst = 1e9;
  const gs = game.gravScale;
  const sims = game.balls.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, size: b.size, kind: b.kind, squash: 0, bv: b.kind === 'gem' ? 0 : E.bounceV(b.size, gs) }));
  const boss = game.boss;
  if (boss && boss.type === 'disco' && !boss.dying) {
    const angry = boss.hp <= boss.maxhp / 2;
    sims.push({ x: boss.x, y: boss.y, vx: boss.vx * (angry ? 1.35 : 1), vy: boss.vy, r: boss.r, size: 0, kind: 'ball', squash: 0, bv: Math.sqrt(2 * E.GRAV * gs * (angry ? 280 : 250)) });
  }
  const frozen = game.freezeT > 0;
  const step = 0.04;
  for (let t = 0; t <= 0.72; t += step) {
    const px = Math.max(PF.l + 12, Math.min(PF.r - 12, p.x + a * E.PLAYER_SPEED * t));
    for (const s of sims) {
      if (!frozen && t > 0) {
        if (s.kind !== 'gem') s.vy += E.GRAV * gs * step;
        s.x += s.vx * step; s.y += s.vy * step;
        if (s.x - s.r < PF.l) { s.x = PF.l + s.r; s.vx = Math.abs(s.vx); }
        if (s.x + s.r > PF.r) { s.x = PF.r - s.r; s.vx = -Math.abs(s.vx); }
        if (s.y + s.r > PF.b) { s.y = PF.b - s.r; s.vy = s.kind === 'gem' ? -Math.abs(s.vy) : -s.bv; }
        if (s.y - s.r < PF.t) { s.y = PF.t + s.r; s.vy = Math.abs(s.vy); }
        for (const k of game.blocks) if (!k.dead) E.Ball.prototype.collideBlock.call(s, k, gs);
      }
      const cx = Math.max(px - 9, Math.min(s.x, px + 9)), cy = Math.max(p.y - 42, Math.min(s.y, p.y));
      const d = Math.hypot(s.x - cx, s.y - cy) - s.r;
      if (d < worst) worst = d;
    }
    if (boss && boss.type === 'mimo' && boss.slam) {
      const d = Math.abs(px - boss.slam.x) - 26 - 9;
      if (d < worst) worst = d;
    }
  }
  return worst;
}

function botCtrl(game, memo) {
  const p = game.player;
  const ctrl = { left: false, right: false, fire: false, firePressed: false, boomPressed: false };
  // Apunta con anticipación: dónde estará el objetivo cuando la onda llegue a su altura
  const lead = (x, y, vx) => {
    const t = Math.max(0, (PF.b - 50 - y) / SP.ent.WIRE_SPEED) * 0.8;
    let nx = x + vx * t;
    if (nx < PF.l + 10) nx = 2 * (PF.l + 10) - nx;
    if (nx > PF.r - 10) nx = 2 * (PF.r - 10) - nx;
    return nx;
  };
  let tx = null;
  const boss = game.boss;
  if (boss && !boss.dying && (game.ballMass() < 10 || memo.bossFocus > 0)) {
    if (boss.type === 'mimo') {
      const t = Math.max(0, (PF.b - 50 - boss.y) / SP.ent.WIRE_SPEED) * 0.8;
      const spd = boss.phase2() ? 0.95 : 0.62;
      tx = 320 + Math.sin((boss.tt || 0) + spd * t) * 226;
    } else {
      tx = lead(boss.x, boss.y, boss.vx);
    }
    memo.bossFocus = (memo.bossFocus || 0) - DT;
  } else {
    if (boss && Math.random() < 0.002) memo.bossFocus = 3;
    let best = null, bestScore = 1e9;
    for (const b of game.balls) {
      if (b.dead) continue;
      const blocked = blockedBelow(game, b.x, b.y);
      const score = Math.abs(b.x - p.x) + (blocked ? 900 : 0) - b.y * 0.3;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    if (best) tx = lead(best.x, best.y, best.vx);
  }
  let dir = 0;
  if (tx !== null) {
    if (tx < p.x - 4) dir = -1;
    else if (tx > p.x + 4) dir = 1;
  }
  // En modo mortal: predice trayectorias y elige el movimiento más seguro
  if (mortal) {
    const margin = (a) => safety(game, a);
    const mDir = margin(dir);
    if (mDir < 14) {
      let best = dir, bestM = mDir;
      for (const a of [-1, 0, 1]) { const m = margin(a); if (m > bestM + 1) { bestM = m; best = a; } }
      dir = best;
    }
  }
  if (dir < 0) ctrl.left = true; else if (dir > 0) ctrl.right = true;
  if (tx !== null) {
    if (Math.abs(tx - p.x) < 10) {
      memo.fireCD -= DT;
      if (memo.fireCD <= 0) { ctrl.firePressed = true; ctrl.fire = true; memo.fireCD = 0.12; }
    }
  }
  if (game.meter >= 1 && game.ballMass() >= 6) ctrl.boomPressed = true;
  return ctrl;
}

function checkSane(game, where) {
  for (const b of game.balls) {
    if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy)) throw new Error('NaN en bola ' + where);
    if (b.x < PF.l - 1 || b.x > PF.r + 1 || b.y > PF.b + 1 || b.y < PF.t - 1) throw new Error('bola fuera del área ' + where + ' ' + JSON.stringify({ x: b.x, y: b.y, r: b.r }));
    for (const k of game.blocks) {
      if (k.dead) continue;
      const cx = Math.max(k.x, Math.min(b.x, k.x + k.w)), cy = Math.max(k.y, Math.min(b.y, k.y + k.h));
      const d = Math.hypot(b.x - cx, b.y - cy);
      if (d < b.r - 3) throw new Error('bola dentro de un bloque ' + where + ' ' + JSON.stringify({ x: b.x, y: b.y, r: b.r, k }));
    }
  }
}

let failures = 0;
const results = [];
const only = process.argv.indexOf('--level') >= 0 ? parseInt(process.argv[process.argv.indexOf('--level') + 1], 10) - 1 : -1;
for (let i = 0; i < SP.LEVELS.length; i++) {
  if (only >= 0 && i !== only) continue;
  const L = SP.LEVELS[i];
  let events = [];
  const game = new SP.Game({ level: i, headless: true, on: (t, d) => events.push(t) });
  const memo = { fireCD: 0 };
  let t = 0, maxBalls = 0, deaths = 0, stuckT = 0, lastPops = 0;
  const limit = mortal && L.boss ? L.t * 3 : L.t + 20;
  let cleared = false;
  let timeLeft = 0;
  try {
    while (t < limit + 10) {
      const ctrl = botCtrl(game, memo);
      const prevState = game.state;
      game.update(DT, ctrl);
      t += DT;
      if (prevState === 'dying' && game.state === 'ready') deaths++;
      maxBalls = Math.max(maxBalls, game.balls.length);
      checkSane(game, SP.levelLabel(i) + ' t=' + t.toFixed(2));
      if (game.state === 'clear' && !cleared) { cleared = true; timeLeft = game.time; }
      if (events.includes('cleared') || events.includes('won')) break;
      if (game.state === 'gameover') break;
      const progress = game.stats.pops + (game.boss ? (game.boss.maxhp - game.boss.hp) * 1000 : 0);
      if (progress === lastPops && game.state === 'play') stuckT += DT; else { stuckT = 0; lastPops = progress; }
      if (only >= 0 && game.boss && Math.floor(t / 20) !== Math.floor((t - DT) / 20)) {
        console.log('  t=' + t.toFixed(0) + 's  jefe hp=' + game.boss.hp.toFixed(1) + '/' + game.boss.maxhp + '  bolas=' + game.balls.length + ' masa=' + game.ballMass() + '  vidas=' + game.lives + '  estado=' + game.state);
      }
      if (stuckT > 40) throw new Error('el bot lleva 40 s sin reventar nada (¿bola inalcanzable?) balls=' + JSON.stringify(game.balls.map(b => [b.size, Math.round(b.x), Math.round(b.y)])));
    }
  } catch (e) {
    failures++;
    results.push({ level: SP.levelLabel(i), error: e.message });
    continue;
  }
  const ok = cleared && (mortal || timeLeft > 0);
  if (!ok) failures++;
  results.push({
    level: SP.levelLabel(i), ok, usado: +(L.t - timeLeft).toFixed(1), limite: L.t, sobra: +timeLeft.toFixed(1),
    pops: game.stats.pops, maxBolas: maxBalls, muertes: deaths, puntos: game.score, estado: game.state
  });
}
console.table(results);

// Una sola partida que encadena niveles: cada nivel superado debe avisar 'cleared'
{
  const events = [];
  const game = new SP.Game({ level: 0, headless: true, on: (t) => events.push(t) });
  const chain = Math.min(3, SP.LEVELS.length - 1);
  for (let i = 0; i < chain; i++) {
    if (i > 0) game.loadLevel(i);
    game.levelClear();
    let t = 0;
    while (t < 30 && events.filter((e) => e === 'cleared').length <= i) { game.update(DT, {}); t += DT; }
    if (events.filter((e) => e === 'cleared').length <= i) {
      failures++;
      console.log('CADENA: el nivel ' + SP.levelLabel(i) + ' se quedó en "nivel superado" sin avanzar');
      break;
    }
  }
}

// Modo sin fin: 6 minutos simulados
{
  const game = new SP.Game({ mode: 'endless', headless: true });
  const memo = { fireCD: 0 };
  let t = 0, maxBalls = 0;
  try {
    while (t < 360 && game.state !== 'gameover') {
      game.update(DT, botCtrl(game, memo));
      t += DT;
      maxBalls = Math.max(maxBalls, game.balls.length);
      checkSane(game, 'sin fin t=' + t.toFixed(1));
    }
    console.log('SIN FIN: ' + t.toFixed(0) + ' s, nivel ' + game.endLevel + ', pops ' + game.stats.pops + ', máx. bolas ' + maxBalls + ', puntos ' + game.score + ', estado ' + game.state);
  } catch (e) {
    failures++;
    console.log('SIN FIN: ERROR ' + e.message);
  }
}

console.log(failures ? '\n✗ ' + failures + ' problema(s)' : '\n✓ todos los niveles se pueden completar');
process.exit(failures && !mortal ? 1 : 0);
