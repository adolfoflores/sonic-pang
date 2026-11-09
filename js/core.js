/* =========================================================
   SONIC PANG — núcleo: constantes, utilidades y guardado
   ========================================================= */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;
  var SP = (root.SP = root.SP || {});

  SP.VERSION = '2.0.0';
  SP.W = 640;
  SP.H = 480;
  // Área de juego (las bolas rebotan dentro de este marco)
  SP.PF = { l: 12, t: 12, r: 628, b: 404 };
  SP.HUD_Y = 416;

  // ---------- Matemática ----------
  SP.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  SP.lerp = function (a, b, t) { return a + (b - a) * t; };
  SP.rand = function (a, b) { return a + Math.random() * (b - a); };
  SP.randi = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  SP.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  SP.sign = function (v) { return v < 0 ? -1 : 1; };
  SP.dist = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
  SP.approach = function (v, target, step) {
    if (v < target) return Math.min(v + step, target);
    return Math.max(v - step, target);
  };
  SP.weighted = function (table) {
    // table: [[valor, peso], ...]
    var total = 0, i;
    for (i = 0; i < table.length; i++) total += table[i][1];
    var r = Math.random() * total;
    for (i = 0; i < table.length; i++) {
      r -= table[i][1];
      if (r <= 0) return table[i][0];
    }
    return table[table.length - 1][0];
  };

  SP.ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outBack: function (t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      var c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    outBounce: function (t) {
      var n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  };

  // RNG con semilla (mulberry32) para fondos y efectos repetibles
  SP.makeRng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  SP.pad = function (n, len, ch) {
    var s = String(Math.floor(n));
    while (s.length < len) s = (ch || '0') + s;
    return s;
  };
  SP.fmtScore = function (n) {
    return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // ---------- Colores ----------
  SP.hexToRgb = function (hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  SP.rgb = function (r, g, b, a) {
    if (a === undefined) return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
    return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
  };
  SP.shade = function (hex, amt) {
    // amt -1..1 (negativo oscurece, positivo aclara)
    var c = SP.hexToRgb(hex);
    for (var i = 0; i < 3; i++) {
      c[i] = amt < 0 ? c[i] * (1 + amt) : c[i] + (255 - c[i]) * amt;
    }
    return SP.rgb(c[0], c[1], c[2]);
  };
  SP.alpha = function (hex, a) {
    var c = SP.hexToRgb(hex);
    return SP.rgb(c[0], c[1], c[2], a);
  };

  // ---------- Guardado (localStorage) ----------
  var KEY = 'sonicpang.save.v1';
  var SCORE_DEFAULTS_VERSION = 2;
  function defaultScores(mode) {
    var names = ['ADOLFO', 'SAMCR0', 'CANK.INC', 'NORDIX-TRAX', 'STATUS-X', 'ELBRUJO', 'RED-POINT', 'MEGABYTE'];
    var points = mode === 'endless'
      ? [3000, 2500, 2000, 1500, 1000, 750, 500, 250]
      : [5000, 4000, 3250, 2500, 1750, 1250, 750, 500];
    var out = [];
    for (var i = 0; i < names.length; i++) {
      out.push({
        name: names[i],
        score: points[i],
        stage: mode === 'endless' ? 'NV 1' : (i < 3 ? '1-2' : '1-1'),
        cpu: true
      });
    }
    return out;
  }
  function defaults() {
    return {
      opts: { music: 0.7, sfx: 0.85, shake: true, scanlines: true },
      scores: { story: defaultScores('story'), endless: defaultScores('endless') },
      scoreDefaultsVersion: SCORE_DEFAULTS_VERSION,
      unlocked: 1,
      seenStory: false,
      cleared: false,
      stats: { pops: 0, games: 0 }
    };
  }
  SP.store = {
    data: defaults(),
    load: function () {
      try {
        var raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw), base = defaults();
          d.opts = Object.assign(base.opts, d.opts || {});
          d.scores = d.scores || base.scores;
          if (!Array.isArray(d.scores.story)) d.scores.story = base.scores.story;
          if (!Array.isArray(d.scores.endless)) d.scores.endless = base.scores.endless;
          d.stats = Object.assign(base.stats, d.stats || {});
          var refreshScores = d.scoreDefaultsVersion !== SCORE_DEFAULTS_VERSION;
          if (refreshScores) {
            // Reemplazar solo los récords de muestra, sin borrar marcas personales.
            ['story', 'endless'].forEach(function (mode) {
              var personal = d.scores[mode].filter(function (entry) { return entry.cpu !== true; });
              var seeds = defaultScores(mode).slice(0, Math.max(0, 10 - personal.length));
              d.scores[mode] = personal.concat(seeds).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
            });
            d.scoreDefaultsVersion = SCORE_DEFAULTS_VERSION;
          }
          this.data = Object.assign(base, d);
          if (refreshScores) this.save();
        }
      } catch (e) { /* sin almacenamiento: seguimos con valores por defecto */ }
      return this.data;
    },
    save: function () {
      try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* nada */ }
    },
    resetScores: function () {
      this.data.scores = { story: defaultScores('story'), endless: defaultScores('endless') };
      this.data.scoreDefaultsVersion = SCORE_DEFAULTS_VERSION;
      this.save();
    },
    qualifies: function (mode, score) {
      var list = this.data.scores[mode];
      if (score <= 0) return false;
      return list.length < 10 || score > list[list.length - 1].score;
    },
    addScore: function (mode, entry) {
      var list = this.data.scores[mode];
      list.push(entry);
      list.sort(function (a, b) { return b.score - a.score; });
      while (list.length > 10) list.pop();
      this.save();
      return list.indexOf(entry);
    },
    top: function (mode) {
      var l = this.data.scores[mode];
      return l.length ? l[0].score : 0;
    }
  };
})();
