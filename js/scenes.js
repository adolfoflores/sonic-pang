/* =========================================================
   SONIC PANG — escenas: loader, intro, título, historia,
   selección de mundo, juego, récords, opciones, ayuda,
   créditos y final
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var G = SP.gfx;
  var I = SP.input;
  var A = SP.audio;
  var T = G.theme;
  var S = SP.scenes = {};

  // =======================================================
  // Utilidades de interfaz
  // =======================================================
  function Menu(items, o) {
    this.items = items;
    this.sel = 0;
    this.x = o.x; this.y = o.y; this.w = o.w; this.h = o.h || 34; this.gap = o.gap || 8;
    this.size = o.size;
    this.color = o.color || '#2d7ff0';
    this.onBack = o.onBack || null;
    while (this.items[this.sel] && this.items[this.sel].disabled) this.sel++;
  }
  Menu.prototype.rect = function (i) {
    return { x: this.x, y: this.y + i * (this.h + this.gap), w: this.w, h: this.h };
  };
  Menu.prototype.move = function (d) {
    var n = this.items.length;
    for (var k = 0; k < n; k++) {
      this.sel = (this.sel + d + n) % n;
      if (!this.items[this.sel].disabled) break;
    }
    A.sfx('move');
  };
  Menu.prototype.update = function () {
    if (I.hit('up')) this.move(-1);
    if (I.hit('down')) this.move(1);
    var it = this.items[this.sel];
    if (it && it.adjust) {
      if (I.hit('left')) { it.adjust(-1); A.sfx('move'); }
      if (I.hit('right')) { it.adjust(1); A.sfx('move'); }
    }
    var m = I.mouse;
    if (m.moved || m.clicked) {
      for (var i = 0; i < this.items.length; i++) {
        var r = this.rect(i);
        if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h && !this.items[i].disabled) {
          if (this.sel !== i) { this.sel = i; A.sfx('move'); }
          if (m.clicked) {
            if (this.items[i].adjust) {
              this.items[i].adjust(m.x < r.x + r.w / 2 ? -1 : 1);
              A.sfx('move');
            } else if (this.items[i].action) {
              A.sfx('select');
              this.items[i].action();
            }
            return;
          }
        }
      }
    }
    if (I.hit('ok') && it && it.action) { A.sfx('select'); it.action(); return; }
    if (I.hit('back') && this.onBack) { A.sfx('back'); this.onBack(); }
  };
  Menu.prototype.draw = function (ctx) {
    for (var i = 0; i < this.items.length; i++) {
      var r = this.rect(i), it = this.items[i];
      var label = typeof it.label === 'function' ? it.label() : it.label;
      G.button(ctx, r.x, r.y, r.w, r.h, label, {
        hover: i === this.sel, color: it.color || this.color, disabled: it.disabled,
        size: this.size || 13
      });
    }
  };

  function heading(ctx, text, y, size) {
    G.text(ctx, text, SP.W / 2, y, {
      size: Math.min(30, size || 28), font: SP.FONT.pixel, color: T.yellow,
      shadow: T.ink, sx: 3, sy: 3, maxWidth: 570
    });
  }
  function drawMenuBg(ctx) { G.menuBackdrop(ctx); }
  function drawLogo(ctx, x, y, scale) {
    G.text(ctx, 'SONIC PANG', x + 3, y + 3, { size: 34 * scale, color: T.line });
    G.text(ctx, 'SONIC PANG', x, y, { size: 34 * scale, color: T.yellow, shadow: T.ink });
  }
  SP.drawLogo = drawLogo;

  function hint(ctx, text, y) {
    G.text(ctx, text, SP.W / 2, y || 462, { size: 8, font: SP.FONT.pixel, color: T.cyan, maxWidth: 600 });
  }

  // =======================================================
  // ARRANQUE: espera las fuentes y prepara los gráficos
  // =======================================================
  S.boot = {
    enter: function () {
      this.t = 0;
      this.ready = false;
      var self = this;
      var done = function () { self.ready = true; };
      try {
        if (document.fonts && document.fonts.load) {
          Promise.all([
            document.fonts.load('10px "Press Start 2P"')
          ]).then(done, done);
          setTimeout(done, 2500);
        } else {
          done();
        }
      } catch (e) { done(); }
      SP.sprites.build();
    },
    update: function (dt) {
      this.t += dt;
      if (this.ready && this.t > 0.15) SP.go('loader', null, true);
    },
    render: function (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SP.W, SP.H);
    }
  };

  // =======================================================
  // LOADER: preparación de las cachés arcade
  // =======================================================
  S.loader = {
    enter: function () {
      this.t = 0;
      this.p = 0;
      this.done = false;
      this.doneT = 0;
      this.prepared = 0;
    },
    update: function (dt) {
      this.t += dt;
      if (!this.done) {
        if (this.prepared < G.BALL_LIST.length) {
          var color = G.BALL_LIST[this.prepared++];
          [40, 27, 14, 7].forEach(function (r) { G.ballImg(color, r); });
        }
        this.p = this.prepared / G.BALL_LIST.length;
        if (this.p >= 1) { G.ITEM_IDS.forEach(function (id) { G.itemImg(id); }); this.done = true; }
      } else {
        this.doneT += dt;
        if (this.doneT > 0.3 && (I.anyHit || I.mouse.clicked)) {
          SP.onFirstGesture && SP.onFirstGesture();
          A.sfx('select'); SP.go('intro');
        }
      }
    },

    render: function (ctx) {
      drawMenuBg(ctx);
      drawLogo(ctx, 320, 160, 1);
      G.loaderBar(ctx, 140, 264, 360, 10, this.p);
      if (this.done && (SP.reduceMotion || Math.floor(this.t * 2) % 2 === 0)) {
        G.text(ctx, I.touch ? 'TOCA PARA EMPEZAR' : 'PULSA PARA EMPEZAR', 320, 320, { size: 13, color: T.yellow });
      }
    }
  };

  // =======================================================
  // INTRO: el reto de la partida
  // =======================================================
  S.intro = {
    enter: function () {
      this.t = 0;
      A.sfx('presents');
    },
    update: function (dt) {
      this.t += dt;
      if (this.t > 2.6 || (this.t > 0.4 && I.anyHit)) {
        SP.go('title');
      }
    },
    render: function (ctx) {
      drawMenuBg(ctx);
      var a = SP.reduceMotion ? 1 : Math.min(1, this.t * 3, Math.max(0, (2.6 - this.t) * 3));
      ctx.save(); ctx.globalAlpha = a;
      heading(ctx, 'TRES VIDAS.', 208, 30);
      G.text(ctx, 'TODO POR JUGAR.', 320, 262, { size: 20, color: T.white });
      ctx.restore();
    }
  };

  // =======================================================
  // TÍTULO
  // =======================================================
  S.title = {
    enter: function () {
      this.t = 0;
      this.idle = 0;
      A.playSong('title');
      var self = this;
      this.menu = new Menu([
        { label: 'JUGAR', color: '#e8262a', action: function () { self.play(); } },
        { label: 'SIN FIN', color: '#f08a00', action: function () { SP.go('play', { mode: 'endless' }); } },
        { label: 'CÓMO JUGAR', action: function () { SP.go('howto'); } },
        { label: 'RÉCORDS', action: function () { SP.go('records'); } },
        { label: 'OPCIONES', action: function () { SP.go('options', { from: 'title' }); } },
        { label: 'CRÉDITOS', action: function () { SP.go('credits'); } }
      ], { x: 330, y: 176, w: 270, h: 38, gap: 2, size: 13 });

    },
    play: function () {
      if (SP.store.data.unlocked > 1) SP.go('worldselect');
      else if (!SP.store.data.seenStory) SP.go('story', { next: { scene: 'play', params: { mode: 'story', level: 0 } } });
      else SP.go('play', { mode: 'story', level: 0 });
    },
    update: function (dt) {
      this.t += dt;
      this.idle += dt;
      if (I.anyHit || I.mouse.moved) this.idle = 0;
      if (this.idle > 22) { SP.go('records', { attract: true }); return; }
      this.menu.update();

    },
    render: function (ctx) {
      var t = SP.reduceMotion ? 0 : this.t;
      drawMenuBg(ctx);
      var best = SP.store.data.scores.story[0];
      G.text(ctx, 'RÉCORD', 26, 25, { size: 9, color: T.cyan, align: 'left' });
      G.text(ctx, (best ? best.name : 'SONIC') + '  ' + SP.pad(best ? best.score : 0, 6), 614, 25, { size: 9, color: T.white, align: 'right', maxWidth: 390 });
      drawLogo(ctx, 320, 78, 1);
      G.text(ctx, 'REVIENTA BURBUJAS. ROMPE RÉCORDS.', 320, 130, { size: 10, color: T.cyan });
      var frame = Math.floor(t * 5) % 19 === 18 ? 'blink' : (Math.floor(t * 3) % 2 ? 'idle1' : 'idle0');
      G.text(ctx, 'SONIC', 174, 212, { size: 10, color: T.cyan });
      ctx.fillStyle = T.ink; ctx.fillRect(122, 389, 110, 6);
      G.drawPixel(ctx, SP.sprites.get(frame), 114, 234, 5, false);
      var ball = G.ballImg('red', 14);
      ctx.drawImage(ball, 46, 210 + Math.round(Math.sin(t * 2) * 6), ball.lw, ball.lh);
      this.menu.draw(ctx);
      G.text(ctx, '¿UNA PARTIDA MÁS?', 320, 448, { size: 10, color: T.yellow });
      G.text(ctx, 'EDICIÓN 2026 · SONIC PANG', 320, 468, { size: 8, color: T.dim });
    }
  };

  // =======================================================
  // HISTORIA
  // =======================================================
  var STORY = [
    { pic: 'sonic', text: 'Sonic nunca para. Púas azules, zapatos rojos y un pie que siempre sigue el ritmo.' },
    { pic: 'mimo', text: 'El Gran Mimo atrapó los sonidos del mundo dentro de burbujas. Todo quedó en silencio.' },
    { pic: 'blast', text: 'Revienta cada burbuja con tu onda sónica. Libera las notas. Devuélvele el ritmo al mundo.' },
    { pic: 'go', text: '' }
  ];
  S.story = {
    enter: function (p) {
      this.next = (p && p.next) || { scene: 'title' };
      this.i = 0;
      this.t = 0;
      this.chars = 0;
      A.playSong('title');
      this.mimo = new SP.ent.Mimo();
    },
    advance: function () {
      var txt = STORY[this.i].text;
      if (this.chars < txt.length) { this.chars = txt.length; return; }
      this.i++;
      this.t = 0;
      this.chars = 0;
      A.sfx('select');
      if (this.i >= STORY.length) this.finish();
    },
    finish: function () {
      SP.store.data.seenStory = true;
      SP.store.save();
      SP.go(this.next.scene, this.next.params);
      this.i = STORY.length - 1;
    },
    update: function (dt) {
      this.t += dt;
      var txt = STORY[this.i] ? STORY[this.i].text : '';
      if (this.chars < txt.length) {
        var before = Math.floor(this.chars);
        this.chars = Math.min(txt.length, this.chars + dt * 38);
        if (Math.floor(this.chars) !== before && Math.floor(this.chars) % 3 === 0) A.sfx('type');
      }
      this.mimo.t += dt;
      if (I.hit('esc')) { A.sfx('back'); this.finish(); return; }
      if (I.hit('ok') || I.mouse.clicked) this.advance();
      if (STORY[this.i] && STORY[this.i].pic === 'go' && this.t > 2.4) this.finish();
    },
    render: function (ctx) {
      var t = SP.reduceMotion ? 0 : this.t, sc = STORY[Math.min(this.i, STORY.length - 1)];
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SP.W, SP.H);
      if (sc.pic === 'go') {
        drawMenuBg(ctx, t, 'pink');
        var k = SP.reduceMotion ? 1 : SP.ease.outQuad(Math.min(1, this.t / 0.3));
        ctx.save();
        ctx.translate(320, 220);
        ctx.scale(k, k);
        G.text(ctx, '¡QUE EMPIECE', 0, -30, { size: 32, font: SP.FONT.pixel, color: '#ffd23f', stroke: '#1a0a00', strokeW: 9, spacing: 2 });
        G.text(ctx, 'EL RUIDO!', 0, 30, { size: 32, font: SP.FONT.pixel, color: '#ffd23f', stroke: '#1a0a00', strokeW: 9, spacing: 2 });
        ctx.restore();
        return;
      }
      // viñeta pixelada
      ctx.save();
      ctx.beginPath();
      ctx.rect(40, 30, 560, 300);
      ctx.clip();
      if (sc.pic === 'sonic') {
        SP.bg.draw(ctx, 'barrio', t);
        var f = (A.beat() % 1) < 0.5 ? 'idle0' : 'idle1';
        G.drawPixel(ctx, SP.sprites.get(f), 320 - 72, 330 - 186 + 30, 6, false);
        for (var n = 0; n < 5; n++) {
          var nt = (t * 0.6 + n * 0.2) % 1;
          ctx.globalAlpha = 1 - nt;
          ctx.drawImage(G.noteImg(['#ffd23f', '#9ff6ff', '#ff9ad0'][n % 3], n % 2), 320 + (n % 2 ? 70 : -90) + Math.sin(nt * 6 + n) * 12, 150 - nt * 120, 24, 30);
        }
        ctx.globalAlpha = 1;
      } else if (sc.pic === 'mimo') {
        G.stripes(ctx, 40, 30, 560, 300, '#0c0c18', '#14142a', 20, t * 10);
        this.mimo.x = 320; this.mimo.y = 170;
        this.mimo.mouth = Math.floor(t * 2) % 3 === 0 ? 'blow' : 'smirk';
        this.mimo.draw(ctx, t);
        for (var b = 0; b < 6; b++) {
          var ang = t * 0.8 + b * (Math.PI / 3);
          var bx = 320 + Math.cos(ang) * 210, by = 180 + Math.sin(ang) * 95;
          var img = G.ballImg(G.BALL_LIST[b], 22);
          ctx.drawImage(img, bx - img.lw / 2, by - img.lh / 2, img.lw, img.lh);
          ctx.globalAlpha = 0.8;
          ctx.drawImage(G.noteImg('#ffffff', b % 2), bx - 7, by - 9, 14, 18);
          ctx.globalAlpha = 1;
        }
      } else if (sc.pic === 'blast') {
        SP.bg.draw(ctx, 'ciudad', t);
        var wx = 320;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(95,243,255,0.35)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        for (var y = 330; y > 30; y -= 3) ctx.lineTo(wx + Math.sin(y / 15 + t * 26) * 5, y);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        G.drawPixel(ctx, SP.sprites.get('shoot'), 320 - 72, 330 - 186 + 30, 6, false);
        for (var q = 0; q < 6; q++) {
          var pt = (t * 0.9 + q / 6) % 1;
          var px = 120 + q * 80, py = 90 + (q % 2) * 60;
          if (pt < 0.6) {
            var im = G.ballImg(G.BALL_LIST[q], 18);
            ctx.drawImage(im, px - im.lw / 2, py - im.lh / 2, im.lw, im.lh);
          } else {
            var k2 = (pt - 0.6) / 0.4;
            ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k2) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(px, py, 18 + k2 * 30, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1 - k2;
            ctx.drawImage(G.noteImg('#ffd23f', q % 2), px - 9, py - 12 - k2 * 40, 18, 24);
            ctx.globalAlpha = 1;
          }
        }
      }
      ctx.restore();
      ctx.lineWidth = 5;
      ctx.strokeStyle = T.line;
      ctx.strokeRect(40, 30, 560, 300);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.strokeRect(36, 26, 568, 308);
      // caja de texto
      G.panel(ctx, 40, 344, 560, 96, { top: 'rgba(255,255,255,0.96)', bottom: 'rgba(230,236,255,0.96)', inner: 'rgba(0,0,0,0.15)', border: '#000', radius: 12 });
      var txt = sc.text.toUpperCase().slice(0, Math.floor(this.chars));
      var lines = G.wrap(ctx, sc.text.toUpperCase(), 520, 11, SP.FONT.pixel);
      var shown = 0;
      for (var l = 0; l < lines.length; l++) {
        var part = txt.slice(shown, shown + lines[l].length);
        shown += lines[l].length + 1;
        G.text(ctx, part, 60, 364 + l * 21, { size: 11, font: SP.FONT.pixel, color: T.white, align: 'left' });
      }
      if (this.chars >= sc.text.length && Math.floor(this.t * 3) % 2 === 0) {
        G.text(ctx, '▼', 578, 426, { size: 12, font: SP.FONT.ui, color: '#e8262a' });
      }
      hint(ctx, 'ESPACIO / CLIC: SIGUIENTE   ·   ESC: SALTAR', 462);
    }
  };

  // =======================================================
  // SELECCIÓN DE MUNDO
  // =======================================================
  S.worldselect = {
    enter: function () {
      this.t = 0;
      this.sel = Math.min(SP.store.data.unlocked, 6) - 1;
      if (!this.thumbs) {
        this.thumbs = SP.WORLDS.map(function (w) {
          var c = G.makeCanvas(176 * 2, 110 * 2);
          var x = c.getContext('2d');
          x.imageSmoothingEnabled = false;
          x.drawImage(SP.bg.get(w.id), 0, 0, 176 * 2, 110 * 2);
          return c;
        });
      }
      A.playSong('title');
    },
    rect: function (i) {
      var col = i % 3, row = Math.floor(i / 3);
      return { x: 40 + col * 194, y: 104 + row * 150, w: 176, h: 110 };
    },
    start: function () {
      var lvl = this.sel * SP.LEVELS_PER_WORLD;
      if (!SP.store.data.seenStory && lvl === 0) SP.go('story', { next: { scene: 'play', params: { mode: 'story', level: 0 } } });
      else SP.go('play', { mode: 'story', level: lvl });
    },
    update: function (dt) {
      this.t += dt;
      var un = SP.store.data.unlocked;
      var old = this.sel;
      if (I.hit('left')) this.sel = Math.max(0, this.sel - 1);
      if (I.hit('right')) this.sel = Math.min(un - 1, this.sel + 1);
      if (I.hit('up') && this.sel >= 3) this.sel -= 3;
      if (I.hit('down') && this.sel + 3 < un) this.sel += 3;
      var m = I.mouse;
      if (m.moved || m.clicked) {
        for (var i = 0; i < 6; i++) {
          var r = this.rect(i);
          if (i < un && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
            this.sel = i;
            if (m.clicked) { A.sfx('select'); this.start(); return; }
          }
        }
      }
      if (old !== this.sel) A.sfx('move');
      if (I.hit('ok')) { A.sfx('select'); this.start(); return; }
      if (I.hit('back')) { A.sfx('back'); SP.go('title'); }
    },
    render: function (ctx) {
      var t = SP.reduceMotion ? 0 : this.t;
      drawMenuBg(ctx, t);
      heading(ctx, 'ELIGE TU MUNDO', 52, 36);
      var un = SP.store.data.unlocked;
      for (var i = 0; i < 6; i++) {
        var r = this.rect(i), w = SP.WORLDS[i];
        var on = i === this.sel, locked = i >= un;
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
        ctx.shadowBlur = 0;
        ctx.drawImage(this.thumbs[i], r.x, r.y, r.w, r.h);
        if (locked) {
          ctx.fillStyle = 'rgba(0,0,10,0.75)';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          G.text(ctx, '?', r.x + r.w / 2, r.y + r.h / 2, { size: 26, font: SP.FONT.pixel, color: '#556', stroke: '#000', strokeW: 5 });
        }
        ctx.lineWidth = 3;
        ctx.strokeStyle = on ? T.yellow : T.line;
        ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
        ctx.restore();
        G.text(ctx, (i + 1) + '. ' + (locked ? '???' : w.name), r.x + r.w / 2, r.y + r.h + 18, {
          size: 10, font: SP.FONT.pixel, maxWidth: 176, color: locked ? T.dim : (on ? '#ffd23f' : '#ffffff'), stroke: '#000', strokeW: 4, spacing: 1
        });
      }
      hint(ctx, '← → ↑ ↓ ELEGIR   ·   ESPACIO / CLIC: JUGAR   ·   ESC: VOLVER', 462);
    }
  };

  // =======================================================
  // JUEGO
  // =======================================================
  S.play = {
    enter: function (p) {
      p = p || {};
      this.t = 0;
      this.paused = false;
      this.over = null;
      this.mode = p.mode || 'story';
      var self = this;
      if (p.resume) {
        this.game = p.resume;
        this.game.on = function (type, data) { self.onEvent(type, data); };
        if (p.continueGame) this.doContinue();
        return;
      }
      this.game = new SP.Game({
        mode: this.mode, level: p.level || 0, score: 0, lives: 3,
        on: function (type, data) { self.onEvent(type, data); }
      });
      this.startLevel = p.level || 0;
      SP.store.data.stats.games++;
      SP.store.save();
    },
    onEvent: function (type, data) {
      var g = this.game, self = this;
      if (type === 'cleared') {
        var next = data.index + 1;
        if (data.lastOfWorld) {
          var w = SP.levelWorld(next) + 1;
          if (w > SP.store.data.unlocked) { SP.store.data.unlocked = Math.min(6, w); SP.store.save(); }
        }
        SP.fadeAction(function () { g.loadLevel(next); });
      } else if (type === 'won') {
        SP.store.data.cleared = true;
        SP.store.data.unlocked = 6;
        SP.store.save();
        SP.go('ending', { score: g.score, game: g });
      } else if (type === 'gameover') {
        this.over = { t: 0, phase: 'gameover', count: 10 };
        void self;
      }
    },
    ctrl: function () {
      return {
        left: I.down('left'), right: I.down('right'),
        fire: I.down('fire'), firePressed: I.hit('fire'),
        boomPressed: I.hit('boom')
      };
    },
    pauseMenu: function () {
      var self = this;
      this.paused = true;
      this.pmenu = new Menu([
        { label: 'CONTINUAR', color: '#2fa84a', action: function () { self.paused = false; } },
        { label: function () { return 'MÚSICA: ' + Math.round(A.musicVol * 10) * 10 + '%'; }, adjust: function (d) { SP.setVolume('music', A.musicVol + d * 0.1); } },
        { label: function () { return 'EFECTOS: ' + Math.round(A.sfxVol * 10) * 10 + '%'; }, adjust: function (d) { SP.setVolume('sfx', A.sfxVol + d * 0.1); } },
        { label: 'SALIR AL MENÚ', color: '#e8262a', action: function () { self.paused = false; SP.go('title'); } }
      ], { x: 200, y: 180, w: 240, h: 38, gap: 9, onBack: function () { self.paused = false; } });
    },
    doContinue: function () {
      var g = this.game;
      this.over = null;
      g.score = 0;
      g.lives = 3;
      g.extendIdx = 0;
      g.meter = 0;
      g.loadLevel(g.levelIndex);
    },
    finishRun: function () {
      var g = this.game;
      var mode = this.mode === 'endless' ? 'endless' : 'story';
      var stage = mode === 'endless' ? 'NV ' + g.endLevel : SP.levelLabel(g.levelIndex);
      if (SP.store.qualifies(mode, g.score)) {
        SP.go('nameentry', { mode: mode, score: g.score, stage: stage, next: { scene: 'records', params: { mode: mode } } });
      } else {
        SP.go('title');
      }
    },
    update: function (dt) {
      this.t += dt;
      var g = this.game;
      if (this.over) { this.updateOver(dt); g.update(dt, { left: false, right: false }); return; }
      if (this.paused) {
        this.pmenu.update();
        if (I.hit('pause') && !I.hit('ok')) this.paused = false;
        return;
      }
      if (I.hit('pause') && (g.state === 'play' || g.state === 'ready')) {
        A.sfx('select');
        this.pauseMenu();
        return;
      }
      if (SP.autoPause) { SP.autoPause = false; if (g.state === 'play') { this.pauseMenu(); return; } }
      g.update(dt, this.ctrl());
    },
    updateOver: function (dt) {
      var o = this.over, g = this.game;
      o.t += dt;
      if (o.phase === 'gameover') {
        if (o.t > 2.6 || (o.t > 0.8 && (I.hit('ok') || I.mouse.clicked))) {
          if (this.mode === 'endless') { this.finishRun(); this.over = null; return; }
          o.phase = 'continue';
          o.t = 0;
          o.count = 10;
          var self = this;
          this.cmenu = new Menu([
            { label: 'OTRA PARTIDA', color: '#2fa84a', action: function () { self.chooseContinue(true); } },
            { label: 'VOLVER AL MENÚ', color: '#e8262a', action: function () { self.chooseContinue(false); } }
          ], { x: 210, y: 268, w: 220, h: 38, gap: 10 });
          A.playSong('title');
        }
      } else if (o.phase === 'continue') {
        var before = Math.ceil(o.count);
        o.count -= dt * 0.9;
        if (Math.ceil(o.count) !== before) A.sfx('tick');
        this.cmenu.update();
        if (this.over && o.count <= 0) this.chooseContinue(false);
      }
    },
    chooseContinue: function (yes) {
      var g = this.game;
      var mode = 'story';
      var stage = SP.levelLabel(g.levelIndex);
      var qualifies = SP.store.qualifies(mode, g.score);
      this.over = null;
      if (yes) {
        if (qualifies) {
          SP.go('nameentry', { mode: mode, score: g.score, stage: stage, next: { scene: 'play', params: { resume: g, continueGame: true } } });
        } else {
          var self = this;
          SP.fadeAction(function () { self.doContinue(); });
        }
      } else {
        this.finishRun();
      }
    },
    render: function (ctx) {
      var g = this.game;
      g.render(ctx);
      if (this.paused) {
        ctx.fillStyle = 'rgba(0,0,12,0.65)';
        ctx.fillRect(0, 0, SP.W, SP.H);
        heading(ctx, 'PAUSA', 120, 46);
        G.text(ctx, 'NIVEL ' + (g.mode === 'endless' ? g.endLevel : SP.levelLabel(g.levelIndex)) + '  ·  ' + SP.fmtScore(g.score) + ' PTS', 320, 156, { size: 9, font: SP.FONT.pixel, color: '#9ff6ff' });
        this.pmenu.draw(ctx);
        hint(ctx, '↑ ↓ ELEGIR  ·  ← → VOLUMEN  ·  P / ESC: SEGUIR', 400);
      }
      if (this.over) {
        var o = this.over;
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.7, o.t * 0.8 + (o.phase === 'continue' ? 0.7 : 0)) + ')';
        ctx.fillRect(0, 0, SP.W, SP.H);
        if (o.phase === 'gameover') {
          var k = SP.reduceMotion ? 1 : SP.ease.outQuad(Math.min(1, o.t / 0.3));
          G.text(ctx, 'FIN DE PARTIDA', 320, -60 + k * 250, { size: 28, font: SP.FONT.pixel, color: '#ff3050', stroke: '#140004', strokeW: 10, shadow: 'rgba(0,0,0,0.6)', sx: 4, sy: 6, spacing: 3 });
          G.text(ctx, SP.fmtScore(g.score) + ' PUNTOS', 320, 260, { size: 12, font: SP.FONT.pixel, color: '#ffffff', alpha: Math.min(1, o.t) });
        } else {
          heading(ctx, '¿OTRA PARTIDA?', 120, 44);
          var n = Math.max(0, Math.ceil(o.count));
          var pulse = SP.reduceMotion ? 1 : 1 + (o.count % 1) * 0.08;
          ctx.save();
          ctx.translate(320, 200);
          ctx.scale(pulse, pulse);
          G.text(ctx, String(n), 0, 0, { size: 42, font: SP.FONT.pixel, color: '#9ff6ff', stroke: '#000', strokeW: 9 });
          ctx.restore();
          this.cmenu.draw(ctx);
          G.text(ctx, 'CONTINUAR REINICIA TUS PUNTOS.', 320, 380, { size: 10, font: SP.FONT.pixel, color: '#c0d0ff' });
        }
      }
    }
  };

  // =======================================================
  // NOMBRE PARA LOS RÉCORDS
  // =======================================================
  var KEYS = ['ABCDEFGHIJ', 'KLMNÑOPQRS', 'TUVWXYZ.-!', '0123456789'];
  S.nameentry = {
    enter: function (p) {
      this.p = p;
      this.t = 0;
      this.name = '';
      this.cx = 0; this.cy = 0;
      this.done = false;
      A.playSong('ending');
      var list = SP.store.data.scores[p.mode];
      var pos = 0;
      while (pos < list.length && list[pos].score >= p.score) pos++;
      this.pos = pos;
    },
    keyRect: function (cx, cy) {
      if (cy < 4) return { x: 120 + cx * 40, y: 228 + cy * 40, w: 36, h: 36 };
      return cx < 5 ? { x: 120, y: 388, w: 196, h: 36 } : { x: 324, y: 388, w: 196, h: 36 };
    },
    press: function (cx, cy) {
      if (cy < 4) this.addChar(KEYS[cy][cx]);
      else if (cx < 5) this.del();
      else this.confirm();
    },
    addChar: function (ch) {
      if (this.name.length >= 8) { A.sfx('error'); return; }
      this.name += ch;
      A.sfx('type');
    },
    del: function () {
      if (this.name.length) { this.name = this.name.slice(0, -1); A.sfx('back'); }
    },
    confirm: function () {
      if (this.done) return;
      this.done = true;
      var name = this.name.trim() || 'SONIC';
      var entry = { name: name, score: this.p.score, stage: this.p.stage };
      var idx = SP.store.addScore(this.p.mode, entry);
      SP.lastEntry = { mode: this.p.mode, index: idx };
      A.sfx('oneup');
      var nx = this.p.next || { scene: 'records', params: { mode: this.p.mode } };
      SP.go(nx.scene, nx.params);
    },
    update: function (dt) {
      this.t += dt;
      if (this.done) return;
      var typed = I.typed, usedKeyboard = false;
      for (var i = 0; i < typed.length; i++) {
        var ch = typed[i];
        if (ch === '\b') { this.del(); usedKeyboard = true; continue; }
        if (ch === '\n') { this.confirm(); return; }
        var up = ch.toUpperCase();
        if (/^[A-Z0-9Ñ.\-! ]$/.test(up)) { this.addChar(up); usedKeyboard = true; }
      }
      if (I.hit('left')) { this.cx = (this.cx + 9) % 10; A.sfx('move'); }
      if (I.hit('right')) { this.cx = (this.cx + 1) % 10; A.sfx('move'); }
      if (I.hit('up')) { this.cy = (this.cy + 4) % 5; A.sfx('move'); }
      if (I.hit('down')) { this.cy = (this.cy + 1) % 5; A.sfx('move'); }
      if (I.hit('select') && !usedKeyboard) this.press(this.cx, this.cy);
      if (I.hit('confirm')) { this.confirm(); return; }
      var m = I.mouse;
      if (m.moved || m.clicked) {
        for (var cy = 0; cy < 5; cy++) {
          var cols = cy < 4 ? 10 : 2;
          for (var cx = 0; cx < cols; cx++) {
            var kx = cy < 4 ? cx : (cx === 0 ? 0 : 5);
            var r = this.keyRect(kx, cy);
            if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
              this.cx = kx; this.cy = cy;
              if (m.clicked) this.press(kx, cy);
            }
          }
        }
      }
    },
    render: function (ctx) {
      var t = SP.reduceMotion ? 0 : this.t;
      drawMenuBg(ctx, t, 'pink');
      heading(ctx, '¡NUEVO RÉCORD!', 52, 40);
      G.text(ctx, SP.fmtScore(this.p.score) + ' PUNTOS  ·  LUGAR #' + (this.pos + 1), 320, 100, { size: 11, font: SP.FONT.pixel, color: '#ffd23f', stroke: '#000', strokeW: 3 });
      G.text(ctx, 'ESCRIBE TU NOMBRE', 320, 134, { size: 11, font: SP.FONT.pixel, color: '#ffffff' });
      G.panel(ctx, 170, 152, 300, 54, {});
      var shown = this.name + (Math.floor(t * 3) % 2 === 0 && this.name.length < 8 ? '_' : ' ');
      G.text(ctx, shown, 320, 181, { size: 22, font: SP.FONT.pixel, color: '#ffffff', spacing: 4 });
      for (var cy = 0; cy < 4; cy++) {
        for (var cx = 0; cx < 10; cx++) {
          var r = this.keyRect(cx, cy), on = cx === this.cx && cy === this.cy;
          ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h);
          ctx.fillStyle = on ? T.line : T.panel;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = on ? T.yellow : T.line;
          ctx.stroke();
          G.text(ctx, KEYS[cy][cx], r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 14, font: SP.FONT.pixel, color: '#fff' });
        }
      }
      var r1 = this.keyRect(0, 4), r2 = this.keyRect(5, 4);
      G.button(ctx, r1.x, r1.y, r1.w, r1.h, 'BORRAR', { hover: this.cy === 4 && this.cx < 5, color: '#e8262a', size: 16 });
      G.button(ctx, r2.x, r2.y, r2.w, r2.h, 'LISTO', { hover: this.cy === 4 && this.cx >= 5, color: '#2fa84a', size: 16 });
      hint(ctx, 'ESCRIBE CON EL TECLADO  ·  ENTER: LISTO', 452);
    }
  };

  // =======================================================
  // RÉCORDS
  // =======================================================
  S.records = {
    enter: function (p) {
      p = p || {};
      this.t = 0;
      this.mode = p.mode || 'story';
      this.attract = !!p.attract;
      this.swapped = false;
      if (!this.attract && A.current !== 'ending') A.playSong('title');
    },
    update: function (dt) {
      this.t += dt;
      if (this.attract) {
        if (this.t > 9 || I.anyHit || I.mouse.clicked) SP.go('title');
        if (this.t > 4.5 && this.mode === 'story' && !this.swapped) { this.swapped = true; this.mode = 'endless'; }
        return;
      }
      if (I.hit('left') || I.hit('right')) { this.mode = this.mode === 'story' ? 'endless' : 'story'; A.sfx('move'); }
      if (I.mouse.clicked) {
        var m = I.mouse;
        if (m.y > 80 && m.y < 112) { this.mode = m.x < 320 ? 'story' : 'endless'; A.sfx('move'); }
        else { A.sfx('back'); SP.lastEntry = null; SP.go('title'); return; }
      }
      if (I.hit('ok') || I.hit('back')) { A.sfx('back'); SP.lastEntry = null; SP.go('title'); }
    },
    render: function (ctx) {
      var t = SP.reduceMotion ? 0 : this.t;
      drawMenuBg(ctx, t);
      heading(ctx, 'RÉCORDS', 48, 42);
      var tabs = [['AVENTURA', 'story'], ['SIN FIN', 'endless']];
      for (var k = 0; k < 2; k++) {
        var on = this.mode === tabs[k][1];
        G.button(ctx, 132 + k * 196, 82, 180, 30, tabs[k][0], { hover: on, tab: true, size: 12 });
      }
      G.panel(ctx, 60, 124, 520, 318, {});
      var list = SP.store.data.scores[this.mode];
      var hl = SP.lastEntry && SP.lastEntry.mode === this.mode ? SP.lastEntry.index : -1;
      var medal = [T.yellow, T.white, T.white];
      for (var i = 0; i < 10; i++) {
        var e = list[i];
        if (!e) continue;
        var y = 148 + i * 29;
        var blink = i === hl && Math.floor(t * 4) % 2 === 0;
        var col = blink ? T.cyan : (i < 3 ? medal[i] : T.white);
        G.text(ctx, (i + 1) + '.', 104, y, { size: 11, font: SP.FONT.pixel, color: col, align: 'right' });
        G.text(ctx, e.name, 122, y, { size: 11, font: SP.FONT.pixel, color: col, align: 'left' });
        G.text(ctx, SP.fmtScore(e.score), 448, y, { size: 11, font: SP.FONT.pixel, color: col, align: 'right' });
        G.text(ctx, e.stage || '', 530, y, { size: 8, font: SP.FONT.pixel, color: '#8fa6e0', align: 'right' });
      }
      hint(ctx, this.attract ? '¿PUEDES SUPERAR ESTAS MARCAS?' : '← → CAMBIAR TABLA  ·  ESPACIO / ESC: VOLVER', 462);
    }
  };

  // =======================================================
  // CÓMO JUGAR
  // =======================================================
  S.howto = {
    enter: function () { this.t = 0; this.page = 0; },
    update: function (dt) {
      this.t += dt;
      var n = 3;
      if (I.hit('left')) { this.page = (this.page + n - 1) % n; A.sfx('move'); }
      if (I.hit('right') || I.hit('ok') || I.mouse.clicked) {
        if (this.page === n - 1 && (I.hit('ok') || I.mouse.clicked)) { A.sfx('back'); SP.go('title'); return; }
        this.page = (this.page + 1) % n;
        A.sfx('move');
      }
      if (I.hit('back')) { A.sfx('back'); SP.go('title'); }
    },
    render: function (ctx) {
      drawMenuBg(ctx);
      heading(ctx, ['CONTROLES', 'LAS BURBUJAS', 'OBJETOS'][this.page], 48, 28);
      G.panel(ctx, 36, 82, 568, 350);
      if (this.page === 0) {
        var rows = [
          ['< > / A D', 'MOVERSE'], ['ESPACIO / Z / ^', 'DISPARAR'],
          ['X / SHIFT', 'BOOM SÓNICO'], ['P / ESC', 'PAUSA'],
          ['M', 'MÚSICA SÍ / NO'], ['F', 'PANTALLA COMPLETA']
        ];
        for (var i = 0; i < rows.length; i++) {
          var y = 116 + i * 38;
          ctx.fillStyle = T.panel; ctx.fillRect(58, y - 14, 218, 28);
          G.text(ctx, rows[i][0], 167, y, { size: 10, color: T.yellow });
          G.text(ctx, rows[i][1], 300, y, { size: 10, color: T.white, align: 'left' });
        }
        G.text(ctx, 'MANDO: A DISPARA · B BOOM · START PAUSA', 320, 365, { size: 9, color: T.cyan });
        G.text(ctx, 'EN CELULAR, USA LOS BOTONES EN PANTALLA.', 320, 394, { size: 9, color: T.cyan });
      } else if (this.page === 1) {
        var sizes = [40, 27, 14, 7], xs = [110, 222, 308, 376];
        for (var s = 0; s < 4; s++) {
          var img = G.ballImg('red', sizes[s]);
          ctx.drawImage(img, xs[s] - img.lw / 2, 148 - img.lh / 2, img.lw, img.lh);
          if (s < 3) G.text(ctx, '>', xs[s] + sizes[s] + 24, 148, { size: 16, color: T.yellow });
        }
        G.text(ctx, '¡POP!', 480, 148, { size: 16, color: T.yellow });
        var lines = [
          'DISPARA: CADA BURBUJA SE DIVIDE EN DOS.',
          'LAS MÁS PEQUEÑAS DESAPARECEN.',
          'LAS GEMAS VIAJAN EN DIAGONAL.',
          'ENLAZA ACIERTOS: COMBOS HASTA X8.',
          'LLENA LA BARRA Y PULSA X: BOOM SÓNICO.',
          'UN GOLPE O TIEMPO AGOTADO: UNA VIDA MENOS.'
        ];
        for (var l = 0; l < lines.length; l++) G.text(ctx, lines[l], 62, 220 + l * 32, { size: 10, color: l === 4 ? T.yellow : T.white, align: 'left', maxWidth: 516 });
      } else {
        var items = [
          ['double', 'DOBLE ONDA', 'DOS DISPAROS'], ['sticky', 'ONDA FIJA', 'SE PEGA AL TECHO'],
          ['vulcan', 'RÁFAGA', 'FUEGO CONTINUO'], ['shield', 'ESCUDO', 'AGUANTA UN GOLPE'],
          ['clock', 'RELOJ', 'CONGELA 5 SEG.'], ['hourglass', 'ARENA', 'CÁMARA LENTA'],
          ['dynamite', 'DINAMITA', 'DIVIDE TODO'], ['battery', 'BATERÍA', 'MEDIA BARRA'],
          ['oneup', '1UP', 'UNA VIDA MÁS'], ['cassette', 'CASSETTE', '500 PUNTOS'],
          ['cd', 'CD', '1,000 PUNTOS'], ['vinyl', 'VINIL', '2,000 PUNTOS'],
          ['goldnote', 'NOTA DORADA', '5,000 PUNTOS']
        ];
        for (var j = 0; j < items.length; j++) {
          var col = j < 7 ? 0 : 1, row = j < 7 ? j : j - 7;
          var x = 58 + col * 274, y2 = 110 + row * 45;
          ctx.drawImage(G.itemImg(items[j][0]), x, y2 - 14, 28, 28);
          G.text(ctx, items[j][1], x + 40, y2 - 6, { size: 9, color: T.yellow, align: 'left' });
          G.text(ctx, items[j][2], x + 40, y2 + 10, { size: 8, color: T.white, align: 'left' });
        }
      }
      G.text(ctx, (this.page + 1) + ' / 3', 320, 447, { size: 8, color: T.yellow });
      hint(ctx, '< > PÁGINA · PULSA PARA SEGUIR · ESC: VOLVER', 469);
    }
  };

  // =======================================================
  // OPCIONES
  // =======================================================
  S.options = {
    enter: function (p) {
      this.t = 0;
      this.from = (p && p.from) || 'title';
      this.confirmReset = false;
      var self = this, o = SP.store.data.opts;
      this.menu = new Menu([
        { label: function () { return 'MÚSICA: ' + Math.round(A.musicVol * 10) * 10 + '%'; }, adjust: function (d) { SP.setVolume('music', A.musicVol + d * 0.1); } },
        { label: function () { return 'EFECTOS: ' + Math.round(A.sfxVol * 10) * 10 + '%'; }, adjust: function (d) { SP.setVolume('sfx', A.sfxVol + d * 0.1); A.sfx('pop', { midi: 76, size: 2 }); } },
        { label: function () { return 'TEMBLOR: ' + (o.shake ? 'SÍ' : 'NO'); }, adjust: function () { o.shake = !o.shake; SP.store.save(); }, action: function () { o.shake = !o.shake; SP.store.save(); } },
        { label: function () { return 'LÍNEAS DE TV: ' + (o.scanlines ? 'ON' : 'OFF'); }, adjust: function () { o.scanlines = !o.scanlines; SP.store.save(); }, action: function () { o.scanlines = !o.scanlines; SP.store.save(); } },
        { label: 'PANTALLA COMPLETA', action: function () { SP.toggleFullscreen(); } },
        { label: function () { return self.confirmReset ? '¿SEGURO? BORRAR' : 'BORRAR RÉCORDS'; }, color: '#e8262a', action: function () {
          if (!self.confirmReset) { self.confirmReset = true; return; }
          SP.store.resetScores();
          SP.store.data.unlocked = 1;
          SP.store.data.seenStory = false;
          SP.store.save();
          self.confirmReset = false;
          A.sfx('shieldbreak');
        } },
        { label: 'VOLVER', color: '#2fa84a', action: function () { SP.go(self.from); } }
      ], { x: 170, y: 104, w: 300, h: 38, gap: 9, onBack: function () { SP.go(self.from); } });
    },
    update: function (dt) {
      this.t += dt;
      var before = this.menu.sel;
      this.menu.update();
      if (this.menu.sel !== before) this.confirmReset = false;
    },
    render: function (ctx) {
      drawMenuBg(ctx, this.t);
      heading(ctx, 'OPCIONES', 52, 42);
      this.menu.draw(ctx);
      hint(ctx, '↑ ↓ ELEGIR  ·  ← → CAMBIAR  ·  ESC: VOLVER', 462);
    }
  };

  // =======================================================
  // CRÉDITOS
  // =======================================================
  var CREDITS = [
    ['h', 'SONIC PANG'],
    ['s', 'EDICIÓN 2026'],
    ['g', ''],
    ['t', 'INSPIRADO EN EL JUEGO ORIGINAL DE'],
    ['n', 'CRASHCOOL'],
    ['g', ''],
    ['n', 'Un homenaje al Sonic Pang'],
    ['n', 'de la era Flash.'],
    ['g', ''],
    ['t', 'PROTAGONISTA'],
    ['n', 'SONIC'],
    ['g', ''],
    ['t', 'EL MALO DE LA PARTIDA'],
    ['n', 'EL GRAN MIMO'],
    ['g', ''],
    ['n', 'Para quienes lo jugaron entonces'],
    ['n', 'y quienes lo descubren hoy.'],
    ['g', ''],
    ['h', 'GRACIAS POR JUGAR'],
    ['g', ''],
    ['n', '¿UNA PARTIDA MÁS?']
  ];
  function drawCredits(ctx, scroll, t) {
    var y = 480 - scroll;
    ctx.save();
    ctx.beginPath(); ctx.rect(24, 24, 592, 408); ctx.clip();
    for (var i = 0; i < CREDITS.length; i++) {
      var c = CREDITS[i];
      if (c[0] !== 'g' && y > -40 && y < 520) {
        G.text(ctx, c[1], 320, Math.round(y), {
          size: c[0] === 'h' ? 24 : (c[0] === 'n' ? 12 : 10),
          font: SP.FONT.pixel,
          color: c[0] === 'h' || c[0] === 't' ? '#ffd23f' : '#ffffff',
          shadow: '#090718', sx: 2, sy: 2
        });
      }
      y += c[0] === 'h' ? 48 : c[0] === 'g' ? 24 : 28;
    }
    ctx.restore();
    return y;
  }
  S.credits = {
    enter: function () { this.t = 0; this.scroll = 0; A.playSong('ending'); },
    update: function (dt) {
      this.t += dt;
      this.scroll += dt * (I.down('fire') || I.down('down') ? 160 : 40);
      if (I.hit('back') || I.mouse.clicked) { A.sfx('back'); SP.go('title'); }
      if (this.endY !== undefined && this.endY < 200) this.scroll -= dt * 40;
    },
    render: function (ctx) {
      drawMenuBg(ctx, this.t, 'pink');
      this.endY = drawCredits(ctx, this.scroll, this.t);
      var f = Math.floor(this.t * 2) % 2 ? 'win' : 'win2';
      G.drawPixel(ctx, SP.sprites.get(f), 548, 380, 2.4, false);
      hint(ctx, 'ESPACIO: RÁPIDO  ·  ESC: VOLVER', 466);
    }
  };

  // =======================================================
  // FINAL
  // =======================================================
  var ENDING = [
    '¡El Gran Mimo fue derrotado!',
    'Cada burbuja reventada liberó una nota... y el mundo volvió a sonar.',
    'Hasta el Mimo terminó bailando. En silencio, claro.',
    'Sonic subió el volumen al máximo. Como debe ser.'
  ];
  S.ending = {
    enter: function (p) {
      this.p = p || {};
      this.score = this.p.score || 0;
      this.t = 0;
      this.i = 0;
      this.pt = 0;
      this.phase = 'story';
      this.finished = false;
      this.scroll = 0;
      this.mimo = new SP.ent.Mimo();
      A.playSong('ending', { restart: true });
    },
    update: function (dt) {
      this.t += dt;
      this.pt += dt;
      this.mimo.t += dt;
      if (this.phase === 'story') {
        if (this.pt > 4.2 || (this.pt > 0.6 && (I.hit('ok') || I.mouse.clicked))) {
          this.i++;
          this.pt = 0;
          if (this.i >= ENDING.length) { this.phase = 'credits'; this.scroll = 0; }
        }
      } else if (this.phase === 'credits') {
        this.scroll += dt * (I.down('fire') ? 160 : 45);
        if (this.endY !== undefined && this.endY < 120) { this.phase = 'fin'; this.pt = 0; }
      } else if (this.phase === 'fin') {
        if (this.pt > 1.2 && (I.hit('ok') || I.mouse.clicked || this.pt > 9)) this.finish();
      }
      if (I.hit('esc') && this.phase !== 'fin') { this.phase = 'fin'; this.pt = 0; }
    },
    finish: function () {
      if (this.finished) return;
      this.finished = true;
      if (SP.store.qualifies('story', this.score)) {
        SP.go('nameentry', { mode: 'story', score: this.score, stage: 'FIN', next: { scene: 'records', params: { mode: 'story' } } });
      } else {
        SP.go('records', { mode: 'story' });
      }
    },
    render: function (ctx) {
      var t = SP.reduceMotion ? 0 : this.t;
      drawMenuBg(ctx, t, 'pink');
      if (this.phase === 'story') {
        SP.bg.draw(ctx, 'espacio', t);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, SP.W, 416);
        // el mimo bailando
        var dance = Math.sin(t * 6);
        this.mimo.x = 440 + dance * 12;
        this.mimo.y = 170 + Math.abs(Math.cos(t * 6)) * -14;
        this.mimo.mouth = this.i >= 2 ? 'smirk' : 'ouch';
        this.mimo.draw(ctx, t);
        var f = this.i >= 3 ? (Math.floor(t * 2) % 2 ? 'win' : 'win2') : ((A.beat() % 1) < 0.5 ? 'idle0' : 'idle1');
        G.drawPixel(ctx, SP.sprites.get(f), 150, 230, 4, false);
        for (var n = 0; n < 10; n++) {
          var nt = (t * 0.35 + n / 10) % 1;
          ctx.globalAlpha = Math.sin(nt * Math.PI);
          ctx.drawImage(G.noteImg(['#ffd23f', '#9ff6ff', '#ff9ad0', '#2fe07a'][n % 4], n % 2), 40 + n * 60 + Math.sin(nt * 8 + n) * 14, 400 - nt * 380, 22, 28);
        }
        ctx.globalAlpha = 1;
        G.panel(ctx, 40, 374, 560, 76, { top: 'rgba(255,255,255,0.95)', bottom: 'rgba(230,236,255,0.95)', inner: 'rgba(0,0,0,0.15)', border: '#000', radius: 12 });
        var txt = ENDING[Math.min(this.i, ENDING.length - 1)];
        var shown = txt.toUpperCase().slice(0, Math.floor(this.pt * 40));
        var lines = G.wrap(ctx, txt.toUpperCase(), 520, 11, SP.FONT.pixel);
        var used = 0;
        for (var l = 0; l < lines.length; l++) {
          G.text(ctx, shown.slice(used, used + lines[l].length), 60, 394 + l * 20, { size: 11, font: SP.FONT.pixel, color: T.white, align: 'left' });
          used += lines[l].length + 1;
        }
      } else if (this.phase === 'credits') {
        this.endY = drawCredits(ctx, this.scroll, t);
      } else {
        drawLogo(ctx, 320, 120, 1);
        heading(ctx, 'FIN', 236, 64);
        G.text(ctx, 'PUNTUACIÓN FINAL', 320, 300, { size: 10, font: SP.FONT.pixel, color: '#9ff6ff' });
        G.text(ctx, SP.fmtScore(this.score), 320, 330, { size: 22, font: SP.FONT.pixel, color: '#ffffff', shadow: '#000', sx: 2, sy: 2 });
        var f2 = Math.floor(t * 2) % 2 ? 'win' : 'win2';
        G.drawPixel(ctx, SP.sprites.get(f2), 72, 300, 3, false);
        if (this.pt > 1.2 && Math.floor(t * 2) % 2 === 0) G.text(ctx, 'PULSA PARA CONTINUAR', 320, 420, { size: 11, font: SP.FONT.pixel, color: '#d8d8d8' });
      }
    }
  };
})();
