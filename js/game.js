/* =========================================================
   SONIC PANG — la partida: reglas, colisiones, puntos,
   combos, ítems, jefes, HUD y efectos
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var PF = SP.PF;
  var E = SP.ent;
  var G = SP.gfx;
  var T = G.theme;

  var EXTENDS = [20000, 60000, 120000, 200000, 320000, 480000, 700000, 1000000];
  var WEIGHT = [8, 4, 2, 1];

  function Game(opts) {
    opts = opts || {};
    this.mode = opts.mode || 'story';
    this.score = opts.score || 0;
    this.lives = opts.lives !== undefined ? opts.lives : 3;
    this.levelIndex = opts.level || 0;
    this.headless = !!opts.headless;
    this.on = opts.on || function () {};
    this.extendIdx = 0;
    while (this.extendIdx < EXTENDS.length && EXTENDS[this.extendIdx] <= this.score) this.extendIdx++;
    this.t = 0;
    this.meter = opts.meter || 0;
    this.shakeT = 0; this.shakeA = 0;
    this.flashT = 0;
    this.banners = [];
    this.texts = [];
    this.fx = [];
    this.stats = { pops: 0, shots: 0, deaths: 0, items: 0, bestCombo: 0 };
    this.vulcanCD = 0;
    this.vside = 1;
    this.hi = SP.store.top(this.mode === 'endless' ? 'endless' : 'story');
    if (this.mode === 'endless') this.setupEndless();
    else this.loadLevel(this.levelIndex);
  }
  SP.Game = Game;

  Game.prototype.emit = function (type, data) { this.on(type, data || {}); };
  Game.prototype.sfx = function (name, p) { if (!this.headless) SP.audio.sfx(name, p); };
  Game.prototype.shake = function (a) {
    if (this.headless || !SP.store.data.opts.shake) return;
    this.shakeA = Math.max(this.shakeA, a);
    this.shakeT = 0.3;
  };
  Game.prototype.banner = function (text, color, dur) {
    this.banners.push({ text: text, color: color || '#ffd23f', t: 0, dur: dur || 1.6 });
  };

  // ---------- Carga de niveles ----------
  Game.prototype.loadLevel = function (i) {
    var L = SP.LEVELS[i];
    this.levelIndex = i;
    this.world = SP.levelWorld(i);
    this.W = SP.WORLDS[this.world];
    this.gravScale = this.world === 5 ? 0.8 : 1;
    this.timeMax = L.t;
    this.time = L.t;
    this.balls = [];
    this.items = [];
    this.shots = [];
    this.fx = [];
    this.texts = [];
    this.banners = [];
    var self = this;
    this.blocks = (L.k || []).map(function (k, idx) {
      return new E.Block(k[0], k[1], k[2], k[3], k[4], L.items && L.items[idx]);
    });
    var cols = this.W.balls;
    (L.b || []).forEach(function (d) {
      var color = typeof d[4] === 'number' ? cols[d[4] % cols.length] : (d[4] || cols[0]);
      self.balls.push(new E.Ball(d[0], d[1], d[2], d[3], color, d[5]));
    });
    this.boss = null;
    if (L.boss === 'disco') this.boss = new E.Disco(320, 150);
    if (L.boss === 'mimo') this.boss = new E.Mimo();
    this.player = new E.Player();
    this.combo = 0; this.comboT = 0;
    this.freezeT = 0; this.slowT = 0;
    this.hurry = false;
    this.lastTick = 99;
    this.state = 'ready';
    this.stateT = 0;
    this.clearEmitted = false;
    this.song = L.boss ? 'boss' : SP.worldSong[this.world];
    if (!this.headless) SP.audio.playSong(this.song);
    this.emit('level', { index: i });
  };

  Game.prototype.setupEndless = function () {
    this.endLevel = 1;
    this.popsInLevel = 0;
    this.world = 0;
    this.W = SP.WORLDS[0];
    this.gravScale = 1;
    this.time = Infinity;
    this.timeMax = Infinity;
    this.balls = [];
    this.items = [];
    this.shots = [];
    this.blocks = [];
    this.boss = null;
    this.player = new E.Player();
    this.combo = 0; this.comboT = 0;
    this.freezeT = 0; this.slowT = 0;
    this.spawnT = 2.5;
    this.state = 'ready';
    this.stateT = 0;
    this.balls.push(new E.Ball(1, 160, 140, 1, 'red'));
    this.balls.push(new E.Ball(1, 480, 140, -1, 'blue'));
    this.song = 'stageC';
    if (!this.headless) SP.audio.playSong('stageC');
  };

  Game.prototype.ballMass = function () {
    var m = 0;
    for (var i = 0; i < this.balls.length; i++) if (!this.balls[i].dead) m += WEIGHT[this.balls[i].size];
    return m;
  };
  Game.prototype.addBall = function (b) { this.balls.push(b); };

  // ---------- Bucle de lógica ----------
  Game.prototype.update = function (dt, ctrl) {
    this.t += dt;
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeA = 0; }
    if (this.flashT > 0) this.flashT -= dt;
    for (var i = this.banners.length - 1; i >= 0; i--) {
      this.banners[i].t += dt;
      if (this.banners[i].t > this.banners[i].dur) this.banners.splice(i, 1);
    }
    this.updateFx(dt);
    var p = this.player;
    switch (this.state) {
      case 'ready':
        this.stateT += dt;
        p.update(dt, ctrl);
        for (var bi = 0; bi < this.balls.length; bi++) {
          var bb = this.balls[bi];
          if (this.stateT > 0.25 + bi * 0.08 && bb.spawn < 1) bb.spawn = Math.min(1, bb.spawn + dt * 4);
        }
        if (this.stateT >= 0.05 && !this.readyBeep) { this.readyBeep = true; this.sfx('ready'); }
        if (this.stateT > 1.8) {
          this.state = 'play';
          this.stateT = 0;
          this.readyBeep = false;
          this.sfx('go');
        }
        break;
      case 'play':
        this.updatePlay(dt, ctrl);
        break;
      case 'hitstop':
        this.stateT += dt;
        if (this.stateT > 0.42) {
          this.state = 'dying';
          this.stateT = 0;
          p.die(this.hitFrom);
          this.sfx('death');
          if (!this.headless) SP.audio.stopSong(0.3);
        }
        break;
      case 'dying':
        this.stateT += dt;
        p.update(dt, ctrl);
        if (this.stateT > 2.3) this.loseLife();
        break;
      case 'timeup':
        this.stateT += dt;
        if (this.stateT > 2.6) this.loseLife();
        break;
      case 'bossdeath':
        this.updateBossDeath(dt, ctrl);
        break;
      case 'clear':
        this.updateClear(dt, ctrl);
        break;
      default:
        break;
    }
  };

  Game.prototype.updatePlay = function (dt, ctrl) {
    var p = this.player;
    p.update(dt, ctrl);
    if (this.vulcanCD > 0) this.vulcanCD -= dt;
    if (ctrl.firePressed || (p.weapon === 'vulcan' && ctrl.fire)) this.tryFire();
    if (ctrl.boomPressed) this.tryBoom();
    if (this.state !== 'play') { this.cleanup(); return; }

    if (this.mode === 'story') {
      this.time -= dt;
      if (!this.hurry && this.time <= 15 && this.timeMax > 30) {
        this.hurry = true;
        this.banner('¡APÚRATE!', '#ff4f6a', 1.8);
        this.sfx('hurry');
      }
      var sec = Math.ceil(this.time);
      if (sec <= 10 && sec < this.lastTick && sec > 0) { this.lastTick = sec; this.sfx('tick'); }
      if (this.time <= 0) { this.time = 0; this.timeUp(); return; }
    }
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    var bdt = this.freezeT > 0 ? 0 : (this.slowT > 0 ? dt * 0.42 : dt);
    var i;
    if (bdt > 0) for (i = 0; i < this.balls.length; i++) this.balls[i].update(bdt, this);
    if (this.boss) this.boss.update(this.freezeT > 0 ? dt * 0.35 : (this.slowT > 0 ? dt * 0.6 : dt), this);

    for (i = 0; i < this.shots.length; i++) this.shots[i].update(dt, this);
    this.resolveShots();
    if (this.state !== 'play') { this.cleanup(); return; }

    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      it.update(dt, this);
      if (!it.dead && Math.abs(it.x - p.x) < 22 && it.y + 13 > p.y - 46 && it.y - 13 < p.y) {
        it.dead = true;
        this.collect(it);
      }
    }

    if (p.invuln <= 0 && !p.dead) {
      for (i = 0; i < this.balls.length; i++) {
        var b = this.balls[i];
        if (!b.dead && p.touches(b)) { this.playerHit(b.x); break; }
      }
      if (this.state === 'play' && p.invuln <= 0 && this.boss && !this.boss.dying) {
        var c = this.boss.hitCircle();
        if (this.boss.type === 'disco' && p.touches(c)) this.playerHit(c.x);
        else if (this.boss.type === 'mimo' && this.boss.slamHits(p)) this.playerHit(this.boss.slam.x);
      }
    }

    if (this.mode === 'endless') this.updateEndless(dt);

    this.cleanup();
    if (this.mode === 'story' && this.state === 'play' && this.balls.length === 0 && !this.boss) this.levelClear();
  };

  Game.prototype.cleanup = function () {
    var j;
    for (j = this.balls.length - 1; j >= 0; j--) if (this.balls[j].dead) this.balls.splice(j, 1);
    for (j = this.shots.length - 1; j >= 0; j--) if (this.shots[j].dead) this.shots.splice(j, 1);
    for (j = this.items.length - 1; j >= 0; j--) if (this.items[j].dead) this.items.splice(j, 1);
    for (j = this.blocks.length - 1; j >= 0; j--) if (this.blocks[j].dead) this.blocks.splice(j, 1);
  };

  // ---------- Disparo ----------
  Game.prototype.tryFire = function () {
    var p = this.player;
    if (p.weapon === 'vulcan') {
      if (this.vulcanCD > 0) return;
      this.vulcanCD = 0.085;
      this.vside = -this.vside;
      this.shots.push(new E.Bullet(p.x + this.vside * 6, p.y - 54));
      this.sfx('vulcan');
      p.shootT = 0.14;
      this.stats.shots++;
      return;
    }
    var max = p.weapon === 'double' ? 2 : 1;
    var active = 0;
    for (var i = 0; i < this.shots.length; i++) if (!this.shots[i].dead && this.shots[i] instanceof E.Wire) active++;
    if (active >= max) return;
    this.shots.push(new E.Wire(p.x, p.weapon === 'sticky'));
    this.sfx(p.weapon === 'sticky' ? 'sticky' : 'shoot');
    p.shootT = 0.2;
    this.stats.shots++;
  };

  Game.prototype.resolveShots = function () {
    for (var i = 0; i < this.shots.length; i++) {
      var s = this.shots[i];
      if (s.dead) continue;
      for (var j = 0; j < this.balls.length; j++) {
        var b = this.balls[j];
        if (b.dead) continue;
        if (s.hits(b)) {
          s.dead = true;
          this.popBall(b, true);
          break;
        }
      }
      if (!s.dead && this.boss && !this.boss.dying) {
        var c = this.boss.hitCircle();
        if (s.hits(c)) {
          s.dead = true;
          this.boss.hit(this, s instanceof E.Bullet ? 0.34 : 1);
        }
      }
    }
  };

  // ---------- Reventar burbujas ----------
  Game.prototype.popBall = function (b, drops, noScoreMult) {
    if (b.dead) return;
    b.dead = true;
    var kids = b.split(this);
    for (var k = 0; k < kids.length; k++) this.balls.push(kids[k]);
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = 1.25;
    if (this.combo > this.stats.bestCombo) this.stats.bestCombo = this.combo;
    var mult = noScoreMult ? 1 : Math.min(this.combo, 8);
    var pts = E.POINTS[b.size] * (b.kind === 'gem' ? 2 : 1) * mult;
    this.addScore(pts, b.x, b.y - b.r * 0.5, mult > 1 ? '#ffd23f' : '#ffffff');
    this.meter = Math.min(1, this.meter + (b.size === 3 ? 0.032 : 0.022) * (1 + Math.min(this.combo, 8) * 0.1));
    var note = SP.audio.popNote(this.combo - 1, b.size);
    this.sfx(b.kind === 'gem' ? 'gem' : 'pop', { midi: note, size: b.size });
    if (this.combo >= 2) this.sfx('combo', { midi: note });
    this.popFx(b);
    if (this.combo >= 3 && this.combo % 1 === 0) this.comboShow = { n: this.combo, t: 0 };
    if (drops && this.items.length < 3 && Math.random() < (b.size < 3 ? 0.13 : 0.07)) {
      this.items.push(new E.Item(SP.weighted(SP.DROPS), b.x, b.y));
    }
    this.stats.pops++;
    if (this.mode === 'endless') this.popsInLevel++;
  };

  Game.prototype.addScore = function (pts, x, y, color) {
    this.score += pts;
    if (this.massPop) { this.massPop.total += pts; x = undefined; }
    if (x !== undefined) {
      // evita que los números se encimen
      for (var i = 0; i < this.texts.length; i++) {
        var o = this.texts[i];
        if (o.t < 0.35 && Math.abs(o.x - x) < 34 && Math.abs(o.y - y) < 13) y = o.y - 13;
      }
      if (this.texts.length > 14) this.texts.shift();
      this.texts.push({ x: x, y: y, str: SP.fmtScore(pts), t: 0, color: color || '#fff' });
    }
    while (this.extendIdx < EXTENDS.length && this.score >= EXTENDS[this.extendIdx]) {
      this.extendIdx++;
      this.lives++;
      this.sfx('oneup');
      this.banner('¡VIDA EXTRA!', '#2fe07a');
    }
    if (this.score > this.hi) this.hi = this.score;
  };

  Game.prototype.breakBlock = function (b) {
    if (b.dead) return;
    b.dead = true;
    this.sfx('glass');
    this.addScore(100, b.x + b.w / 2, b.y);
    for (var i = 0; i < 14; i++) {
      this.fx.push({
        type: 'shard', x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h,
        vx: SP.rand(-120, 120), vy: SP.rand(-200, 40), life: 0.9, max: 0.9,
        rot: Math.random() * 6, vr: SP.rand(-10, 10), size: SP.rand(3, 7)
      });
    }
    if (b.item) this.items.push(new E.Item(b.item, b.x + b.w / 2, b.y + b.h / 2));
  };

  // ---------- Ítems ----------
  Game.prototype.collect = function (it) {
    var p = this.player;
    var info = SP.ITEM_INFO[it.type] || {};
    this.stats.items++;
    switch (it.type) {
      case 'double': case 'sticky': case 'vulcan':
        p.weapon = it.type;
        this.sfx('weapon');
        break;
      case 'shield':
        p.shield = true;
        this.sfx('shield');
        break;
      case 'clock':
        this.freezeT = 5;
        this.slowT = 0;
        this.sfx('freeze');
        break;
      case 'hourglass':
        this.slowT = 6.5;
        this.sfx('slow');
        break;
      case 'dynamite':
        this.dynamite();
        break;
      case 'battery':
        this.meter = Math.min(1, this.meter + 0.5);
        this.sfx('charge');
        break;
      case 'oneup':
        this.lives++;
        this.sfx('oneup');
        break;
      default:
        if (info.pts) { this.addScore(info.pts, it.x, it.y - 18, '#7fffd4'); this.sfx('points'); }
        break;
    }
    this.texts.push({ x: it.x, y: it.y - 30, str: info.name || it.type, t: 0, color: '#9ff6ff', small: true });
    this.spark(it.x, it.y, '#ffffff', 6);
  };

  // Muchos reventones a la vez: un solo total en pantalla
  Game.prototype.beginMassPop = function () { this.massPop = { total: 0 }; };
  Game.prototype.endMassPop = function (x, y, color) {
    var m = this.massPop;
    this.massPop = null;
    if (m && m.total > 0) this.texts.push({ x: x, y: y, str: '+' + SP.fmtScore(m.total), t: 0, color: color || '#ffd23f', big: true });
  };

  Game.prototype.dynamite = function () {
    this.sfx('dynamite');
    this.shake(6);
    this.flashT = 0.15;
    this.beginMassPop();
    for (var pass = 0; pass < 3; pass++) {
      var list = this.balls.slice();
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!b.dead && b.size < 3) this.popBall(b, false, true);
      }
      this.cleanup();
    }
    this.endMassPop(this.player.x, this.player.y - 80, '#ff9a3c');
  };

  Game.prototype.tryBoom = function () {
    if (this.meter < 1) { return; }
    this.meter = 0;
    var p = this.player;
    this.sfx('boom');
    this.shake(10);
    this.flashT = 0.22;
    p.invuln = Math.max(p.invuln, 0.8);
    this.fx.push({ type: 'ring', x: p.x, y: p.y - 30, r0: 10, r1: 520, life: 0.6, max: 0.6, color: '#9ff6ff', w: 10 });
    this.fx.push({ type: 'ring', x: p.x, y: p.y - 30, r0: 10, r1: 380, life: 0.45, max: 0.45, color: '#ffffff', w: 6 });
    var list = this.balls.slice();
    this.beginMassPop();
    for (var i = 0; i < list.length; i++) if (!list[i].dead) this.popBall(list[i], false);
    this.endMassPop(p.x, p.y - 90, '#9ff6ff');
    if (this.boss && !this.boss.dying) this.boss.hit(this, 3);
    this.banner('¡BOOM SÓNICO!', '#9ff6ff', 1.2);
  };

  // ---------- Golpes y vidas ----------
  Game.prototype.playerHit = function (fromX) {
    var p = this.player;
    if (SP.debug && SP.debug.god) return;
    if (p.shield) {
      p.shield = false;
      p.invuln = 1.5;
      this.sfx('shieldbreak');
      this.shake(4);
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        this.fx.push({ type: 'spark', x: p.x + Math.cos(a) * 30, y: p.y - 28 + Math.sin(a) * 30, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, max: 0.5, color: '#9ff6ff', size: 5 });
      }
      return;
    }
    if (this.mode === 'endless') {
      this.lives--;
      this.stats.deaths++;
      if (this.lives > 0) {
        p.invuln = 2.4;
        this.sfx('hurt');
        this.shake(8);
        this.flashT = 0.2;
        var list = this.balls.slice();
        for (var k = 0; k < list.length; k++) { list[k].dead = true; this.popFx(list[k]); }
        this.items.length = 0;
        this.banner('¡AUCH! ' + this.lives + (this.lives === 1 ? ' VIDA' : ' VIDAS'), '#ff4f6a');
        this.spawnT = 2.2;
        return;
      }
    }
    this.state = 'hitstop';
    this.stateT = 0;
    this.hitFrom = fromX;
    this.sfx('hurt');
    this.shake(6);
    this.flashT = 0.12;
  };

  Game.prototype.loseLife = function () {
    if (this.mode === 'story') {
      this.lives--;
      this.stats.deaths++;
    }
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = 'gameover';
      this.stateT = 0;
      if (!this.headless) SP.audio.playSong('gameover', { restart: true });
      this.emit('gameover', { score: this.score });
      return;
    }
    // Contra un jefe no se pierde el avance: conserva el daño recibido
    var bossHp = (this.boss && !this.boss.dying) ? this.boss.hp : null;
    var beaten = this.bossBeaten === this.levelIndex;
    this.loadLevel(this.levelIndex);
    if (beaten && this.boss) {
      this.boss = null;
      this.spawnDiscoShards(320, 200);
      for (var i = 0; i < this.balls.length; i++) this.balls[i].spawn = 0;
    } else if (bossHp !== null && this.boss) {
      this.boss.hp = bossHp;
    }
  };

  Game.prototype.spawnDiscoShards = function (bx, by) {
    var cols = this.W.balls;
    for (var k = 0; k < 8; k++) {
      var kb = new E.Ball(3, bx + (k - 3.5) * 14, by, k % 2 ? 1 : -1, cols[k % cols.length]);
      kb.vy = SP.rand(-420, -220);
      kb.spawn = 1;
      this.balls.push(kb);
    }
  };

  Game.prototype.timeUp = function () {
    this.state = 'timeup';
    this.stateT = 0;
    this.player.dead = false;
    this.sfx('death');
    if (!this.headless) SP.audio.stopSong(0.3);
  };

  // ---------- Nivel completado ----------
  Game.prototype.levelClear = function () {
    this.state = 'clear';
    this.stateT = 0;
    this.player.win = true;
    this.player.moving = false;
    this.shots.length = 0;
    var L = SP.LEVELS[this.levelIndex];
    var secs = Math.max(0, Math.ceil(this.time));
    this.tally = { time: secs * 100 * (L.boss ? 2 : 1), given: 0, boss: !!L.boss };
    var lastOfWorld = (this.levelIndex % SP.LEVELS_PER_WORLD) === SP.LEVELS_PER_WORLD - 1;
    this.lastOfWorld = lastOfWorld;
    if (!this.headless) SP.audio.playSong(lastOfWorld ? 'worldclear' : 'clear', { restart: true });
    for (var i = 0; i < 18; i++) {
      this.fx.push({
        type: 'confetti', x: SP.rand(40, 600), y: SP.rand(-80, 0), vx: SP.rand(-30, 30), vy: SP.rand(60, 160),
        life: 3, max: 3, rot: Math.random() * 6, vr: SP.rand(-8, 8), color: SP.pick(['#ff4f6a', '#ffd23f', '#2fe07a', '#18d0d0', '#a03ae6', '#ffffff']), size: SP.rand(4, 8)
      });
    }
  };
  Game.prototype.updateClear = function (dt, ctrl) {
    this.stateT += dt;
    this.player.update(dt, ctrl);
    var tl = this.tally;
    if (this.stateT > 1.0 && tl.given < tl.time) {
      var step = Math.max(100, Math.ceil(tl.time / 40 / 100) * 100);
      var add = Math.min(step, tl.time - tl.given);
      tl.given += add;
      this.addScore(add);
      if (Math.floor(this.t * 30) % 2 === 0) this.sfx('tally');
    }
    for (var i = 0; i < this.items.length; i++) this.items[i].update(dt, this);
    var done = tl.given >= tl.time && this.stateT > 3.2;
    if (done && !this.clearEmitted) {
      this.clearEmitted = true;
      var final = this.levelIndex === SP.LEVELS.length - 1;
      this.emit(final ? 'won' : 'cleared', { index: this.levelIndex, lastOfWorld: this.lastOfWorld });
    }
  };

  // ---------- Jefes ----------
  Game.prototype.bossDefeated = function (boss) {
    if (boss.dying) return;
    boss.dying = true;
    this.state = 'bossdeath';
    this.stateT = 0;
    this.explodeT = 0;
    this.shots.length = 0;
    this.sfx('bossdie');
    this.shake(10);
    this.flashT = 0.25;
    if (!this.headless) SP.audio.stopSong(0.2);
    this.addScore(boss.type === 'mimo' ? 50000 : 20000, boss.x, boss.y - 60, '#ffd23f');
  };
  Game.prototype.updateBossDeath = function (dt, ctrl) {
    this.stateT += dt;
    this.player.update(dt, { left: false, right: false });
    var b = this.boss;
    if (b) {
      b.flash = 0.05;
      b.t += dt;
      this.explodeT -= dt;
      if (this.explodeT <= 0) {
        this.explodeT = 0.13;
        this.explosion(b.x + SP.rand(-50, 50), b.y + SP.rand(-50, 50));
        this.sfx('dynamite');
        this.shake(5);
      }
      if (this.stateT > 2.4) {
        for (var i = 0; i < 4; i++) this.explosion(b.x + SP.rand(-30, 30), b.y + SP.rand(-30, 30));
        for (var n = 0; n < 24; n++) {
          this.fx.push({
            type: 'note', x: b.x, y: b.y, vx: SP.rand(-220, 220), vy: SP.rand(-260, 60), life: 1.8, max: 1.8,
            color: SP.pick(['#ff4fb0', '#18d0d0', '#ffd23f', '#2fe07a', '#ffffff']), kind: n % 2, grav: 120
          });
        }
        this.flashT = 0.4;
        this.shake(12);
        this.sfx('boom');
        var bx = b.x, by = b.y;
        this.boss = null;
        if (b.type === 'disco') {
          this.bossBeaten = this.levelIndex;
          this.spawnDiscoShards(bx, by);
          this.banner('¡A LIMPIAR!', '#ffd23f', 1.4);
          this.state = 'play';
        } else {
          var list = this.balls.slice();
          this.beginMassPop();
          for (var j = 0; j < list.length; j++) this.popBall(list[j], false, true);
          this.endMassPop(320, 260, '#ffd23f');
          this.cleanup();
          this.balls.length = 0;
          this.levelClear();
        }
      }
    }
  };

  // ---------- Modo sin fin ----------
  Game.prototype.updateEndless = function (dt) {
    this.spawnT -= dt * (this.freezeT > 0 ? 0 : 1);
    var lvl = this.endLevel;
    if (this.spawnT <= 0) {
      this.spawnT = Math.max(2.1, 6.2 - lvl * 0.42);
      if (this.ballMass() < 9 + lvl * 2.2) {
        var size = SP.weighted(lvl < 3 ? [[1, 6], [2, 4]] : lvl < 6 ? [[0, 2], [1, 6], [2, 3]] : [[0, 4], [1, 5], [2, 3]]);
        var gem = lvl >= 3 && Math.random() < Math.min(0.35, 0.06 * lvl) && size > 0;
        var r = E.SIZE_R[size];
        var x = SP.rand(PF.l + r + 10, PF.r - r - 10);
        var b = new E.Ball(size, x, PF.t + r + 6, Math.random() < 0.5 ? -1 : 1, SP.pick(this.W.balls), gem ? 'g' : null);
        b.spawn = 0;
        this.balls.push(b);
        this.sfx('blow');
      }
    }
    if (this.popsInLevel >= 26 + lvl * 4) {
      this.popsInLevel = 0;
      this.endLevel++;
      this.world = (this.endLevel - 1) % 6;
      this.W = SP.WORLDS[this.world];
      this.gravScale = this.world === 5 ? 0.8 : 1;
      this.banner('¡NIVEL ' + this.endLevel + '!', '#2fe07a', 1.8);
      this.sfx('weapon');
      this.addScore(1000 * this.endLevel, 320, 200, '#2fe07a');
    }
  };

  // =======================================================
  // Efectos
  // =======================================================
  Game.prototype.popFx = function (b) {
    if (this.headless) return;
    var base = (G.BALL_COLORS[b.color] || G.BALL_COLORS.red)[1];
    this.fx.push({ type: 'ring', x: b.x, y: b.y, r0: b.r * 0.6, r1: b.r * 1.9, life: 0.3, max: 0.3, color: base, w: 3 });
    var n = 6 + (3 - b.size) * 3;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = SP.rand(60, 200 + (3 - b.size) * 40);
      this.fx.push({
        type: 'frag', x: b.x + Math.cos(a) * b.r * 0.5, y: b.y + Math.sin(a) * b.r * 0.5,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.55, max: 0.55, color: base, size: SP.rand(2, 4.5)
      });
    }
    var notes = b.size <= 1 ? 2 : 1;
    for (var k = 0; k < notes; k++) {
      this.fx.push({
        type: 'note', x: b.x + SP.rand(-8, 8), y: b.y, vx: SP.rand(-40, 40), vy: SP.rand(-110, -70),
        life: 1.1, max: 1.1, color: SP.pick(['#ffffff', '#9ff6ff', '#ffe27a', '#ffb0e0']), kind: Math.random() < 0.5 ? 0 : 1, sway: Math.random() * 6
      });
    }
    this.fx.push({ type: 'spark', x: b.x - b.r * 0.3, y: b.y - b.r * 0.3, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#ffffff', size: b.r * 0.7 + 4 });
  };
  Game.prototype.spark = function (x, y, color, n) {
    if (this.headless) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = SP.rand(40, 160);
      this.fx.push({ type: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, color: color, size: SP.rand(3, 6) });
    }
  };
  Game.prototype.dust = function (x, y) {
    if (this.headless) return;
    for (var i = 0; i < 10; i++) {
      this.fx.push({ type: 'smoke', x: x + SP.rand(-20, 20), y: y - 4, vx: SP.rand(-120, 120), vy: SP.rand(-60, -10), life: 0.6, max: 0.6, size: SP.rand(6, 12) });
    }
  };
  Game.prototype.explosion = function (x, y) {
    if (this.headless) return;
    this.fx.push({ type: 'ring', x: x, y: y, r0: 6, r1: 60, life: 0.35, max: 0.35, color: '#ffd23f', w: 5 });
    this.fx.push({ type: 'flashball', x: x, y: y, life: 0.25, max: 0.25, size: 34 });
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * Math.PI * 2, sp = SP.rand(80, 260);
      this.fx.push({ type: 'frag', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, max: 0.6, color: SP.pick(['#ffd23f', '#ff7a1a', '#ffffff']), size: SP.rand(2, 5) });
    }
  };
  Game.prototype.updateFx = function (dt) {
    var fx = this.fx;
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i];
      f.life -= dt;
      if (f.life <= 0) { fx.splice(i, 1); continue; }
      if (f.type === 'frag' || f.type === 'shard') {
        f.vy += 700 * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.rot !== undefined) f.rot += f.vr * dt;
      } else if (f.type === 'note') {
        f.vy += (f.grav || -20) * dt;
        f.x += (f.vx + Math.sin(f.life * 6 + (f.sway || 0)) * 20) * dt;
        f.y += f.vy * dt;
      } else if (f.type === 'spark' || f.type === 'smoke') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.vx *= 0.92; f.vy *= 0.92;
      } else if (f.type === 'confetti') {
        f.x += (f.vx + Math.sin(f.life * 5) * 30) * dt; f.y += f.vy * dt;
        f.rot += f.vr * dt;
      }
    }
    if (fx.length > 500) fx.splice(0, fx.length - 500);
    for (var j = this.texts.length - 1; j >= 0; j--) {
      var t = this.texts[j];
      t.t += dt;
      t.y -= (t.small ? 30 : t.big ? 26 : 40) * dt * (t.t < 0.3 ? 2 : 0.6);
      if (t.t > (t.big ? 1.6 : 1.0)) this.texts.splice(j, 1);
    }
    if (this.comboShow) {
      this.comboShow.t += dt;
      if (this.comboShow.t > 1.1) this.comboShow = null;
    }
  };
  Game.prototype.drawFx = function (ctx) {
    var fx = this.fx;
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i], k = f.life / f.max;
      if (f.type === 'frag') {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.type === 'shard') {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = 'rgba(190,240,255,0.9)';
        ctx.strokeStyle = '#0a2448';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-f.size, -f.size * 0.4); ctx.lineTo(f.size, 0); ctx.lineTo(-f.size * 0.3, f.size * 0.6); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (f.type === 'ring') {
        var r = SP.lerp(f.r1, f.r0, k);
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = k;
        ctx.lineWidth = (f.w || 3) * k + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.type === 'note') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.drawImage(G.noteImg(f.color, f.kind), f.x - 8, f.y - 10, 16, 20);
        ctx.globalAlpha = 1;
      } else if (f.type === 'spark') {
        G.sparkle(ctx, f.x, f.y, f.size * (0.4 + k * 0.6), f.color, k);
      } else if (f.type === 'smoke') {
        ctx.fillStyle = 'rgba(220,210,230,' + (0.45 * k) + ')';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (1.6 - k * 0.6), 0, Math.PI * 2); ctx.fill();
      } else if (f.type === 'confetti') {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = f.color;
        ctx.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2);
        ctx.restore();
      } else if (f.type === 'flashball') {
        var gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        gr.addColorStop(0, 'rgba(255,255,230,' + k + ')');
        gr.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (var j = 0; j < this.texts.length; j++) {
      var t = this.texts[j];
      var tl = t.big ? 1.6 : 1.0;
      var a = t.t > tl - 0.3 ? 1 - (t.t - (tl - 0.3)) / 0.3 : 1;
      var sc = t.t < 0.12 ? 0.6 + t.t / 0.12 * 0.4 : 1;
      G.text(ctx, t.str, t.x, t.y, {
        size: Math.round((t.big ? 17 : t.small ? 9 : 11) * sc), font: SP.FONT.pixel, color: t.color,
        stroke: '#10081a', strokeW: t.big ? 6 : 4, alpha: a
      });
    }
  };

  // =======================================================
  // Dibujo
  // =======================================================
  function drawFrame(ctx) {
    ctx.fillStyle = T.ink;
    ctx.fillRect(0, 0, SP.W, PF.t);
    ctx.fillRect(0, PF.t, PF.l, PF.b - PF.t);
    ctx.fillRect(PF.r, PF.t, SP.W - PF.r, PF.b - PF.t);
    ctx.fillRect(0, PF.b, SP.W, SP.H - PF.b);
    ctx.strokeStyle = T.line; ctx.lineWidth = 2;
    ctx.strokeRect(PF.l - 1, PF.t - 1, PF.r - PF.l + 2, PF.b - PF.t + 2);
    ctx.fillStyle = T.line;
    ctx.fillRect(0, SP.HUD_Y - 6, SP.W, 2);
    ctx.fillRect(210, SP.HUD_Y + 6, 2, 48);
    ctx.fillRect(426, SP.HUD_Y + 6, 2, 48);
  }

  Game.prototype.render = function (ctx) {
    var t = this.t;
    // El escenario se dibuja a 320x208; la interfaz conserva sus 640x480.
    // Esto mantiene los sprites, jefes y fondos en la misma cuadrícula visual.
    var screen = ctx;
    if (!this.worldCanvas) {
      this.worldCanvas = G.makeCanvas(320, 208);
      this.worldContext = this.worldCanvas.getContext('2d');
    }
    ctx = this.worldContext;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    ctx.clearRect(0, 0, SP.W, SP.HUD_Y);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (!SP.reduceMotion && this.shakeA > 0 && this.shakeT > 0) {
      var a = this.shakeA * (this.shakeT / 0.3);
      ctx.translate(SP.rand(-a, a), SP.rand(-a, a));
    }
    // fondo y área de juego
    ctx.save();
    ctx.beginPath();
    ctx.rect(PF.l, PF.t, PF.r - PF.l, PF.b - PF.t);
    ctx.clip();
    SP.bg.draw(ctx, this.W.id, t, 0.08);
    var i;
    for (i = 0; i < this.blocks.length; i++) this.blocks[i].draw(ctx, t);
    for (i = 0; i < this.items.length; i++) this.items[i].draw(ctx);
    for (i = 0; i < this.shots.length; i++) this.shots[i].draw(ctx);
    if (this.player && !this.player.dead) this.player.draw(ctx, t);
    var frozen = this.freezeT > 0;
    for (i = 0; i < this.balls.length; i++) this.balls[i].draw(ctx, frozen, t);
    if (this.boss) this.boss.draw(ctx, t);
    this.drawFx(ctx);
    if (frozen) {
      ctx.fillStyle = 'rgba(140,200,255,' + (0.1 + 0.04 * Math.sin(t * 6)) + ')';
      ctx.fillRect(PF.l, PF.t, PF.r - PF.l, PF.b - PF.t);
    } else if (this.slowT > 0) {
      ctx.fillStyle = 'rgba(255,220,140,0.07)';
      ctx.fillRect(PF.l, PF.t, PF.r - PF.l, PF.b - PF.t);
    }
    ctx.restore();
    if (this.player && this.player.dead) this.player.draw(ctx, t);
    ctx.restore();
    ctx = screen;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.worldCanvas, 0, 0, SP.W, SP.HUD_Y);
    drawFrame(ctx);
    this.drawHUD(ctx);
    this.drawOverlays(ctx);

    if (!SP.reduceMotion && this.flashT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.7, this.flashT * 3) + ')';
      ctx.fillRect(0, 0, SP.W, SP.H);
    }
  };

  Game.prototype.drawHUD = function (ctx) {
    var y = SP.HUD_Y, px = SP.FONT.pixel;
    G.text(ctx, 'PUNTOS', 18, y + 12, { size: 8, color: T.yellow, align: 'left' });
    G.text(ctx, SP.pad(this.score, 8), 18, y + 29, { size: 13, color: T.white, align: 'left' });
    G.text(ctx, 'RÉCORD ' + SP.fmtScore(Math.max(this.hi, this.score)), 18, y + 51, { size: 7, color: T.cyan, align: 'left', maxWidth: 132 });
    G.drawPixel(ctx, SP.sprites.head(), 154, y + 18, 1, false);
    G.text(ctx, 'x' + Math.max(0, this.lives), 181, y + 46, { size: 9, color: T.white });
    var cx = 318;
    G.text(ctx, this.W.name, cx, y + 12, { size: 8, color: T.cyan });
    if (this.mode === 'endless') {
      G.text(ctx, 'NIVEL ' + this.endLevel, cx, y + 34, { size: 15, color: T.yellow, maxWidth: 180 });
      G.cylBar(ctx, 240, y + 52, 156, 5, this.popsInLevel / (26 + this.endLevel * 4), T.green);
    } else {
      var secs = Math.max(0, Math.ceil(this.time)), low = secs <= 15;
      G.text(ctx, SP.levelLabel(this.levelIndex), 240, y + 35, { size: 11, color: T.white, align: 'left' });
      G.text(ctx, SP.pad(secs, 2), 396, y + 34, { size: 20, color: low ? T.red : T.white, align: 'right' });
      G.cylBar(ctx, 240, y + 52, 156, 5, this.time / this.timeMax, low ? T.red : T.cyan);
    }
    var weapon = this.player ? this.player.weapon : 'single';
    if (weapon === 'single') {
      ctx.fillStyle = T.cyan;
      for (var n = 0; n < 6; n++) ctx.fillRect(448 + (n % 2) * 4, y + 13 + n * 4, 4, 6);
    } else ctx.drawImage(G.itemImg(weapon), 438, y + 12, 28, 28);
    if (this.player && this.player.shield) ctx.drawImage(G.itemImg('shield'), 458, y + 28, 14, 14);
    G.text(ctx, 'ARMA', 453, y + 51, { size: 7, color: T.cyan });
    var full = this.meter >= 1;
    G.text(ctx, 'BOOM SÓNICO', 554, y + 12, { size: 8, color: full ? T.yellow : T.cyan });
    G.cylBar(ctx, 488, y + 27, 132, 10, this.meter, full ? T.yellow : T.cyan);
    G.text(ctx, full ? (SP.input && SP.input.touch ? '¡BOOM LISTO!' : '¡LISTO! [X]') : 'CARGANDO', 554, y + 51, { size: 8, color: full ? T.yellow : T.dim });
  };

  Game.prototype.drawOverlays = function (ctx) {
    var cx = 320, cy = 190, T = G.theme;
    if (this.state === 'ready') {
      G.panel(ctx, 60, 110, 520, 176);
      var label = this.mode === 'endless' ? 'MODO SIN FIN' : (SP.LEVELS[this.levelIndex].boss ? '¡JEFE!' : 'NIVEL ' + SP.levelLabel(this.levelIndex));
      G.text(ctx, label, cx, 148, { size: 28, color: T.yellow, maxWidth: 480, shadow: T.ink });
      var sub = this.mode === 'endless' ? '¿CUÁNTO PUEDES AGUANTAR?' : (SP.LEVELS[this.levelIndex].boss ? (this.levelIndex === SP.LEVELS.length - 1 ? 'EL GRAN MIMO' : 'LA BOLA DISCO') : this.W.name + ' · ' + this.W.sub.toUpperCase());
      G.text(ctx, sub, cx, 190, { size: 10, color: T.white, maxWidth: 480 });
      if (this.stateT > 0.4) G.text(ctx, this.stateT < 1.15 ? '¡LISTO!' : '¡YA!', cx, 244, { size: 24, color: this.stateT < 1.15 ? T.cyan : T.yellow });
    }
    var bannerY = this.state === 'clear' ? 290 : 120;
    for (var i = 0; i < this.banners.length; i++) {
      var b = this.banners[i];
      var a = b.t > b.dur - 0.3 ? (b.dur - b.t) / 0.3 : 1;
      G.text(ctx, b.text, cx, bannerY + i * 34, { size: 18, color: T.yellow, shadow: T.ink, maxWidth: 560, alpha: SP.clamp(a, 0, 1) });
    }
    if (this.comboShow && this.state === 'play') {
      var c = this.comboShow;
      G.text(ctx, 'COMBO x' + Math.min(c.n, 8) + (c.n > 8 ? '+' : ''), 614, 50, {
        size: 12, color: T.yellow, shadow: T.ink, align: 'right', alpha: SP.clamp(c.t > 0.8 ? 1 - (c.t - 0.8) / 0.3 : 1, 0, 1)
      });
    }
    if (this.state === 'timeup') {
      G.panel(ctx, 76, 142, 488, 102);
      G.text(ctx, 'TIEMPO AGOTADO', cx, 192, { size: 26, color: T.red, shadow: T.ink });
    }
    if (this.state === 'clear') {
      var head = this.tally.boss ? '¡JEFE DERROTADO!' : (this.lastOfWorld ? '¡MUNDO SUPERADO!' : '¡NIVEL SUPERADO!');
      G.panel(ctx, 62, 88, 516, 168);
      G.text(ctx, head, cx, 122, { size: 24, color: T.yellow, shadow: T.ink, maxWidth: 480 });
      if (this.stateT > 0.6) {
        G.text(ctx, 'BONO DE TIEMPO', cx, 164, { size: 9, color: T.cyan });
        G.text(ctx, SP.fmtScore(this.tally.given), cx, 194, { size: 20, color: T.white });
        G.text(ctx, 'PUNTOS: ' + SP.fmtScore(this.score), cx, 230, { size: 10, color: T.yellow });
      }
    }
    if (this.boss && this.state !== 'ready') {
      G.text(ctx, this.boss.name, cx, 22, { size: 9, color: T.white, shadow: T.ink });
      G.cylBar(ctx, 170, 34, 300, 8, Math.max(0, this.boss.hp / this.boss.maxhp), T.red);
    }
  };
})();
