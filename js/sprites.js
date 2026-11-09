/* =========================================================
   SONIC PANG — Sonic en el mismo pixel art de 24 × 32.
   Púas azules, ojos verdes, guantes blancos y zapatos rojos.
   Cuadros generados en vivo, con contorno y sombreado.
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;

  var PAL = {
    k: '#160f29', c: '#2478f5', C: '#1746aa', d: '#102c70', l: '#71c9ff',
    s: '#ffdaa5', S: '#e8a66b', e: '#111827', i: '#ffffff',
    g: '#34bd69', G: '#ffe06a', m: '#793442', t: '#ff8798',
    w: '#f7f9ff', W: '#aebfda', r: '#f63849', R: '#b51e3b', h: '#ff7a80'
  };
  var SHADE = { c: 'C', l: 'c', s: 'S', w: 'W', r: 'R' };

  function Grid(w, h) {
    this.w = w; this.h = h;
    this.d = [];
    for (var i = 0; i < w * h; i++) this.d.push('.');
  }
  Grid.prototype.set = function (x, y, c) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  };
  Grid.prototype.get = function (x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '.';
    return this.d[y * this.w + x];
  };

  function autoShade(g) {
    var src = g.d.slice();
    var mid = g.w / 2;
    for (var y = 0; y < g.h; y++) {
      for (var x = 0; x < g.w; x++) {
        var c = src[y * g.w + x];
        if (c === '.' || !SHADE[c]) continue;
        var right = x + 1 < g.w ? src[y * g.w + x + 1] : '.';
        if (x >= mid - 1 && right === '.') g.d[y * g.w + x] = SHADE[c];
      }
    }
  }
  function outline(g) {
    var src = g.d.slice();
    for (var y = 0; y < g.h; y++) {
      for (var x = 0; x < g.w; x++) {
        if (src[y * g.w + x] !== '.') continue;
        var n = (y > 0 && src[(y - 1) * g.w + x] !== '.') ||
                (y < g.h - 1 && src[(y + 1) * g.w + x] !== '.') ||
                (x > 0 && src[y * g.w + x - 1] !== '.') ||
                (x < g.w - 1 && src[y * g.w + x + 1] !== '.');
        if (n) g.d[y * g.w + x] = 'k';
      }
    }
  }
  function toCanvas(g, pal) {
    var c = SP.gfx.makeCanvas(g.w, g.h);
    var ctx = c.getContext('2d');
    if (!ctx) return c;
    for (var y = 0; y < g.h; y++) {
      for (var x = 0; x < g.w; x++) {
        var ch = g.d[y * g.w + x];
        if (ch === '.') continue;
        ctx.fillStyle = (pal || PAL)[ch] || '#f0f';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  // ---------- Pintor del personaje ----------
  // Los zapatos quedan anclados al suelo; el bob solo mueve el cuerpo.
  function paintHero(o) {
    var g = new Grid(24, 32);
    var b = o.bob || 0;
    var side = o.face === 'right';
    function P(x, y, c) { g.set(x, y, c); }
    function H(x0, x1, y, c) { for (var x = x0; x <= x1; x++) P(x, y, c); }
    function U(x, y, c) { P(x, y + b, c); }
    function UH(x0, x1, y, c) { H(x0, x1, y + b, c); }

    function shoe(x, y, dark, tap) {
      var red = dark ? 'R' : 'r', white = dark ? 'W' : 'w';
      function S(dx, dy, c) { P(x + dx, y + dy - (tap && dx >= 4 ? 1 : 0), c); }
      // Calcetín doblado, punta redonda, correa y hebilla dorada.
      for (var sx = 1; sx <= 4; sx++) { S(sx, -1, white); S(sx, 0, red); }
      S(5, 0, red);
      for (var dx = 0; dx < 8; dx++) {
        S(dx, 1, red); S(dx, 2, 'R'); S(dx, 3, white);
      }
      S(1, 0, dark ? 'r' : 'h'); S(2, 0, dark ? 'r' : 'h');
      for (var sy = 0; sy <= 2; sy++) { S(3, sy, white); S(4, sy, white); }
      S(5, 1, 'G');
    }

    var legs = o.legs || 'stand';
    if (legs === 'stand' || legs === 'tap') {
      for (var ly = 22; ly <= 26; ly++) { H(9, 10, ly, 'C'); H(15, 16, ly, 'c'); }
      shoe(5, 27, true, false);
      shoe(14, 27, false, legs === 'tap');
    } else if (legs === 'walkA' || legs === 'walkC') {
      var swap = legs === 'walkC';
      H(9, 10, 23, swap ? 'c' : 'C'); H(7, 9, 24, swap ? 'c' : 'C'); H(6, 7, 25, swap ? 'c' : 'C');
      H(14, 15, 23, swap ? 'C' : 'c'); H(15, 16, 24, swap ? 'C' : 'c'); H(16, 17, 25, swap ? 'C' : 'c');
      shoe(2, 26, !swap, true);
      shoe(14, 27, swap, false);
    } else if (legs === 'walkB' || legs === 'walkD') {
      var forward = legs === 'walkB';
      H(10, 12, 23, 'C'); H(12, 13, 24, 'C'); H(11, 12, 25, 'C');
      H(14, 15, 23, 'c'); H(13, 14, 24, 'c'); H(13, 14, 25, 'c'); H(14, 15, 26, 'c');
      shoe(forward ? 7 : 12, forward ? 25 : 27, true, false);
      shoe(forward ? 12 : 6, forward ? 27 : 25, false, false);
    } else if (legs === 'air') {
      H(8, 10, 23, 'C'); H(7, 8, 24, 'C'); H(15, 17, 23, 'c'); H(17, 18, 24, 'c');
      shoe(3, 26, true, false);
      shoe(14, 26, false, true);
    }

    // Cola corta, espalda azul y vientre beige.
    U(7, 19, 'c'); UH(6, 10, 20, 'c'); UH(8, 11, 21, 'C');
    UH(11, 15, 15, 'c');
    for (var ty = 16; ty <= 21; ty++) UH(10, 16, ty, 'c');
    UH(11, 16, 22, 'C'); UH(10, 12, 23, 'C'); UH(15, 16, 23, 'c');
    UH(13, 15, 16, 's');
    for (var by = 17; by <= 20; by++) UH(12, 15, by, 's');
    UH(13, 15, 21, 'S'); U(16, 18, 'S'); U(16, 19, 'S');

    function glove(x, y, dark) {
      var white = dark ? 'W' : 'w';
      UH(x + 1, x + 3, y, white);
      UH(x, x + 4, y + 1, white);
      UH(x, x + 4, y + 2, white);
      UH(x + 1, x + 3, y + 3, 'W');
      U(x + 1, y + 1, 'i'); U(x + 3, y + 2, 'W');
    }
    function hip() {
      U(9, 17, 'c'); UH(7, 8, 18, 's'); U(6, 19, 's');
      UH(6, 7, 20, 'S'); UH(7, 9, 21, 's');
      UH(8, 10, 20, 'W'); glove(8, 20, false);
    }
    function down() {
      U(17, 17, 'c'); U(17, 18, 's'); U(18, 19, 's'); U(18, 20, 's');
      UH(17, 20, 21, 'W'); glove(17, 21, false);
    }
    var arms = o.arms || 'hip';
    if (arms === 'hip') { hip(); down(); }
    else if (arms === 'swingB') {
      U(9, 17, 'c'); UH(7, 8, 18, 's'); UH(5, 6, 19, 's');
      UH(4, 6, 20, 'W'); glove(2, 20, true);
      U(17, 17, 'c'); UH(18, 19, 18, 's'); U(20, 17, 's');
      UH(19, 21, 16, 'W'); glove(18, 15, false);
    } else if (arms === 'swingF') {
      U(9, 17, 'c'); U(8, 18, 's'); UH(9, 11, 19, 's');
      UH(11, 13, 18, 'W'); glove(12, 17, false);
      U(17, 17, 'C'); U(18, 18, 'S'); U(18, 19, 'S');
      UH(17, 19, 20, 'W'); glove(17, 20, true);
    } else if (arms === 'thumb') {
      hip();
      U(17, 17, 'c'); U(18, 18, 's'); UH(18, 20, 19, 's');
      UH(19, 21, 19, 'W'); glove(18, 16, false);
      U(20, 14, 'w'); U(20, 15, 'w'); U(21, 15, 'W');
    }

    // Tres púas largas hacia atrás, otras dos arriba y orejas pequeñas.
    if (side) {
      U(6, 3, 'c'); UH(5, 8, 4, 'c'); U(10, 2, 'c'); UH(9, 12, 3, 'c');
      UH(8, 17, 4, 'c'); UH(6, 19, 5, 'c');
      UH(3, 20, 6, 'c'); UH(1, 20, 7, 'c'); UH(5, 20, 8, 'c');
      UH(6, 20, 9, 'c'); UH(3, 20, 10, 'c'); UH(1, 19, 11, 'C');
      UH(5, 19, 12, 'c'); UH(5, 17, 13, 'c'); UH(3, 12, 14, 'C');
      UH(2, 9, 15, 'C'); UH(5, 8, 16, 'd');
      UH(4, 7, 7, 'l'); UH(7, 11, 5, 'l'); UH(8, 10, 4, 'l');
      UH(3, 7, 11, 'd'); UH(4, 7, 14, 'd');
      U(14, 3, 'c'); U(14, 4, 's'); U(14, 5, 'S');
      U(18, 3, 'c'); U(18, 4, 's'); U(18, 5, 'C');
    } else {
      U(9, 2, 'c'); U(13, 2, 'c'); UH(8, 15, 3, 'c');
      UH(6, 17, 4, 'c'); UH(5, 18, 5, 'c'); UH(4, 19, 6, 'c');
      UH(2, 21, 7, 'c'); UH(5, 18, 8, 'c'); UH(4, 19, 9, 'c');
      UH(1, 22, 10, 'c'); UH(4, 19, 11, 'C'); UH(5, 18, 12, 'c');
      UH(3, 20, 13, 'c'); UH(2, 21, 14, 'C'); UH(5, 18, 15, 'C');
      UH(7, 11, 4, 'l'); UH(5, 8, 5, 'l'); U(4, 7, 'l');
      U(6, 3, 'c'); U(6, 4, 's'); U(7, 5, 'S');
      U(17, 3, 'c'); U(17, 4, 's'); U(16, 5, 'S');
    }

    // Ojos grandes unidos, iris verdes y cejas inclinadas.
    var left = side ? 12 : 7, right = side ? 17 : 13;
    function eye(x) {
      UH(x + 1, x + 2, 7, 'w');
      for (var ey = 8; ey <= 11; ey++) UH(x, x + 3, ey, 'w');
      U(x + 1, 9, 'g'); U(x + 1, 10, 'g'); U(x + 1, 11, 'g');
      U(x + 2, 9, 'e'); U(x + 2, 10, 'e'); U(x + 2, 8, 'i');
    }
    eye(left); eye(right); UH(left + 4, right - 1, 10, 'w');
    U(left, 7, 'C'); U(left + 1, 7, 'C'); U(left + 2, 8, 'C');
    U(right + 1, 8, 'C'); U(right + 2, 7, 'C'); U(right + 3, 7, 'C');
    var eyes = o.eyes || 'open';
    function expression(x, kind) {
      for (var ey = 8; ey <= 11; ey++) UH(x, x + 3, ey, 'w');
      if (kind === 'x') {
        U(x, 8, 'e'); U(x + 2, 8, 'e'); U(x + 1, 9, 'e'); U(x, 10, 'e'); U(x + 2, 10, 'e');
      } else if (kind === 'happy' || kind === 'wink') {
        UH(x + 1, x + 2, 9, 'e'); U(x, 10, 'e'); U(x + 3, 10, 'e');
      } else {
        UH(x, x + 2, 10, 'e'); U(x + 3, 9, 'e');
      }
    }
    if (eyes !== 'open') {
      if (eyes !== 'wink') expression(left, eyes);
      expression(right, eyes);
    }

    // Hocico saliente, nariz pequeña y sonrisa ladeada.
    var muzzle = side ? 11 : 7;
    UH(muzzle, muzzle + 9, 12, 's'); UH(muzzle - 1, muzzle + 10, 13, 's');
    UH(muzzle, muzzle + 9, 14, 's'); UH(muzzle + 1, muzzle + 7, 15, 'S');
    var nose = side ? 20 : 12;
    UH(nose, nose + 2, 11, 'e'); UH(nose + 1, nose + 2, 12, 'e'); U(nose, 11, 'W');
    var mx = side ? 15 : 12;
    var mouth = o.mouth || 'smile';
    if (mouth === 'open') {
      UH(mx - 1, mx + 2, 13, 'm'); UH(mx, mx + 2, 14, 'm'); U(mx + 1, 14, 't');
    } else if (mouth === 'grin') {
      UH(mx, mx + 3, 13, 'i'); UH(mx + 1, mx + 3, 14, 'm'); U(mx + 4, 12, 'm');
    } else {
      UH(mx + 1, mx + 3, 14, 'm'); U(mx + 4, 13, 'm');
    }

    // El pulgar queda delante del hocico en la pose de victoria.
    if (arms === 'thumb') { U(21, 14, 'w'); U(21, 15, 'w'); U(20, 16, 'w'); }

    // Disparo y daño: guantes levantados delante de las púas.
    if (arms === 'up' || arms === 'flail') {
      var gy = arms === 'up' ? 9 : 12;
      UH(7, 9, 17, 's'); UH(5, 7, 16, 's'); UH(4, 5, 15, 's'); U(3, 14, 's');
      UH(16, 18, 17, 's'); UH(18, 19, 16, 's'); U(20, 15, 's'); U(20, 14, 's');
      UH(2, 4, gy + 4, 'W'); UH(19, 21, gy + 4, 'W');
      glove(1, gy, false); glove(18, gy, false);
    }

    autoShade(g);
    outline(g);
    return g;
  }

  // ---------- Cuadros del personaje ----------
  var FRAMES = {
    idle0: { face: 'right', legs: 'stand', arms: 'hip', eyes: 'open', mouth: 'smile' },
    idle1: { face: 'right', legs: 'tap', arms: 'hip', eyes: 'open', mouth: 'smile' },
    blink: { face: 'right', legs: 'stand', arms: 'hip', eyes: 'closed', mouth: 'smile' },
    walk0: { face: 'right', legs: 'walkA', arms: 'swingB', eyes: 'open', mouth: 'smile' },
    walk1: { face: 'right', legs: 'walkB', arms: 'swingF', eyes: 'open', mouth: 'smile', bob: -1 },
    walk2: { face: 'right', legs: 'walkC', arms: 'swingF', eyes: 'open', mouth: 'smile' },
    walk3: { face: 'right', legs: 'walkD', arms: 'swingB', eyes: 'open', mouth: 'smile', bob: -1 },
    shoot: { face: 'front', legs: 'stand', arms: 'up', eyes: 'happy', mouth: 'open' },
    win: { face: 'right', legs: 'stand', arms: 'thumb', eyes: 'wink', mouth: 'grin' },
    win2: { face: 'front', legs: 'stand', arms: 'up', eyes: 'happy', mouth: 'grin', bob: -1 },
    hurt: { face: 'front', legs: 'air', arms: 'flail', eyes: 'x', mouth: 'open' },
    look: { face: 'right', legs: 'stand', arms: 'hip', eyes: 'open', mouth: 'smile' }
  };

  var cache = {};
  SP.sprites = {
    PAL: PAL,
    grids: {},
    get: function (name) {
      if (cache[name]) return cache[name];
      var def = FRAMES[name];
      if (!def) return null;
      var g = paintHero(def);
      this.grids[name] = g;
      cache[name] = toCanvas(g);
      return cache[name];
    },
    // Cabeza completa para el contador de vidas, incluidas las púas.
    head: function () {
      if (cache._head) return cache._head;
      var src = this.get('idle0');
      var c = SP.gfx.makeCanvas(24, 19);
      var ctx = c.getContext('2d');
      if (ctx) ctx.drawImage(src, 0, 0, 24, 17, 0, 1, 24, 17);
      cache._head = c;
      return c;
    },
    names: Object.keys(FRAMES),
    build: function () {
      for (var i = 0; i < this.names.length; i++) this.get(this.names[i]);
      this.head();
    },
    W: 24,
    H: 32
  };
})();
