/* =========================================================
   SONIC PANG — gráficos: tipografía pixel, menús, barras por segmentos,
   bolas, gemas, íconos de ítems y efectos arcade
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;

  SP.FONT = { pixel: '"Press Start 2P", "Courier New", monospace' };
  SP.FONT.ui = SP.FONT.pixel;
  var G = SP.gfx = { S: 1, cache: {} };
  // Paleta compartida con css/tokens.css; los mundos conservan sus colores.
  var T = G.theme = {
    night: '#060b20', ink: '#020612', panel: '#0b1740', line: '#263e78',
    white: '#f5f7ff', yellow: '#ffd23f', cyan: '#8fc8ff', dim: '#8e9cc5',
    red: '#f63849', green: '#55d88b', building: '#0b1330', window: '#274b86'
  };

  G.makeCanvas = function (w, h) {
    var c;
    if (typeof document !== 'undefined') {
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w));
      c.height = Math.max(1, Math.ceil(h));
    } else {
      c = { width: w, height: h, getContext: function () { return null; } };
    }
    return c;
  };
  G.setScale = function (s) {
    s = SP.clamp(Math.ceil(s), 1, 3);
    if (s !== G.S) { G.S = s; G.cache = {}; }
  };
  function cached(key, w, h, draw) {
    var c = G.cache[key];
    if (c) return c;
    var S = G.S;
    c = G.makeCanvas(w * S, h * S);
    var ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(S, S);
      draw(ctx, w, h);
    }
    c.lw = w; c.lh = h;
    G.cache[key] = c;
    return c;
  }
  G.cached = cached;
  G.drawCached = function (ctx, img, x, y, w, h) {
    ctx.drawImage(img, x, y, w || img.lw, h || img.lh);
  };

  // ---------- Texto ----------
  G.font = function (ctx, size, family, weight) {
    ctx.font = (weight ? weight + ' ' : '') + size + 'px ' + (family || SP.FONT.pixel);
  };
  // La fuente pixel no trae mayúsculas acentuadas: las quitamos (Ñ se conserva)
  var accentCache = {};
  function stripAccents(s) {
    if (accentCache[s] !== undefined) return accentCache[s];
    var out = s.replace(/←/g, '<').replace(/→/g, '>').replace(/↑/g, '^').replace(/↓/g, 'v')
      .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
      .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u');
    accentCache[s] = out;
    return out;
  }
  G.stripAccents = stripAccents;

  G.text = function (ctx, str, x, y, o) {
    o = o || {};
    str = stripAccents(String(str));
    var size = o.size || 12;
    G.font(ctx, size, o.font);
    if (o.maxWidth && ctx.measureText(str).width > o.maxWidth) {
      size = Math.max(6, Math.floor(size * o.maxWidth / ctx.measureText(str).width));
      G.font(ctx, size, o.font);
    }
    ctx.save();
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    x = Math.round(x); y = Math.round(y);
    if (o.shadow || o.stroke) {
      ctx.fillStyle = T.ink;
      ctx.fillText(str, x + (o.sx === undefined ? 2 : o.sx), y + (o.sy === undefined ? 2 : o.sy));
    }
    ctx.fillStyle = o.color || T.white;
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  G.measure = function (ctx, str, size, family, spacing) {
    if (family === SP.FONT.pixel) str = stripAccents(String(str));
    G.font(ctx, size, family);
    var hasLS = 'letterSpacing' in ctx;
    if (hasLS) ctx.letterSpacing = (spacing || 0) + 'px';
    var w = ctx.measureText(str).width;
    if (hasLS) ctx.letterSpacing = '0px';
    return w;
  };
  // Texto con letras que bailan (títulos)
  G.wavyText = function (ctx, str, x, y, o, time) {
    var size = o.size || 32;
    var total = G.measure(ctx, str, size, o.font, o.spacing);
    var cx = x - total / 2;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var w = G.measure(ctx, ch, size, o.font, o.spacing);
      var dy = Math.sin(time * (o.speed || 6) + i * 0.55) * (o.amp || 3);
      G.text(ctx, ch, cx + w / 2, y + dy, Object.assign({}, o, { align: 'center' }));
      cx += w;
    }
  };
  // Párrafo con salto de línea automático
  G.wrap = function (ctx, str, maxW, size, family) {
    G.font(ctx, size, family);
    var words = str.split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // ---------- Formas ----------
  G.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  G.star = function (ctx, x, y, r1, r2, n, rot) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? r2 : r1;
      var a = rot + (i * Math.PI) / n - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  G.rays = function (ctx, cx, cy, n, rot, radius, c1, c2) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    var step = (Math.PI * 2) / n;
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, i * step, (i + 1) * step);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  G.sparkle = function (ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
    ctx.fillStyle = color || '#fff';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  };

  // ---------- Barras arcade ----------
  G.cylBar = function (ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = T.panel;
    ctx.fillRect(x, y, w, h);
    var count = Math.floor(w / 6), filled = Math.round(count * SP.clamp(frac, 0, 1));
    ctx.fillStyle = color || T.cyan;
    for (var i = 0; i < filled; i++) ctx.fillRect(x + i * 6, y, 4, h);
  };
  G.loaderBar = function (ctx, x, y, w, h, frac) {
    G.cylBar(ctx, x, y, w, h, frac, T.yellow);
  };

  // Texto, cursor y área de pulsación constante para teclado, ratón y táctil.
  G.button = function (ctx, x, y, w, h, label, o) {
    o = o || {};
    var selected = !!o.hover && !o.disabled;
    var color = o.disabled ? T.dim : selected ? T.yellow : T.white;
    var size = Math.min(o.size || 14, 16);
    var centered = o.align === 'center';
    if (o.tab) {
      ctx.fillStyle = selected ? T.line : T.ink;
      ctx.fillRect(x, y, w, h);
      centered = true;
    }
    G.text(ctx, label, centered ? x + w / 2 : x + 26, y + h / 2, {
      size: size, font: SP.FONT.pixel, color: color, align: centered ? 'center' : 'left',
      maxWidth: w - (centered ? 16 : 36), shadow: T.ink
    });
    if (selected && !centered) G.text(ctx, '>', x + 6, y + h / 2, { size: size, color: T.yellow, align: 'left' });
  };
  G.panel = function (ctx, x, y, w, h) {
    ctx.fillStyle = T.night;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = T.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  };

  // Ciudad de píxeles: misma composición en todas las pantallas de menú.
  G.menuBackdrop = function (ctx) {
    var img = cached('arcade-city', SP.W, SP.H, function (c) {
      var rng = SP.makeRng(2026);
      c.fillStyle = T.night; c.fillRect(0, 0, SP.W, SP.H);
      c.fillStyle = T.line;
      for (var i = 0; i < 38; i++) c.fillRect(Math.floor(rng() * 320) * 2, Math.floor(rng() * 200) * 2, 2, 2);
      for (var layer = 0; layer < 2; layer++) {
        var x = -16;
        while (x < SP.W) {
          var w = (12 + Math.floor(rng() * 23)) * 2;
          var h = (10 + Math.floor(rng() * (layer ? 55 : 38))) * 2;
          c.fillStyle = layer ? T.building : T.panel;
          c.fillRect(x, 432 - h, w, h);
          for (var wy = 442 - h; wy < 424; wy += 16) {
            for (var wx = x + 8; wx < x + w - 8; wx += 14) {
              if (rng() > 0.65) { c.fillStyle = T.window; c.fillRect(wx, wy, 4, 6); }
            }
          }
          x += w + 4;
        }
      }
      c.fillStyle = T.ink; c.fillRect(0, 432, SP.W, 48);
    });
    ctx.drawImage(img, 0, 0, SP.W, SP.H);
  };

  // ---------- Bolas ----------
  G.BALL_COLORS = {
    red: ['#ffc4b4', '#f22b2b', '#6e0000'],
    blue: ['#c4e6ff', '#2a7cf0', '#0a2470'],
    green: ['#d4ffbc', '#2fc63a', '#0a5212'],
    yellow: ['#fff8c0', '#ffc81e', '#8a5200'],
    purple: ['#ecccff', '#a03ae6', '#380866'],
    orange: ['#ffdcb4', '#ff7a1a', '#7a2600'],
    cyan: ['#ccfffa', '#18d0d0', '#035258'],
    pink: ['#ffd2ec', '#ff4fb0', '#740a46']
  };
  G.BALL_LIST = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];

  G.ballImg = function (color, r) {
    var cols = G.BALL_COLORS[color] || G.BALL_COLORS.red;
    var size = r * 2 + 6;
    return cached('ball_' + color + '_' + r, size, size, function (ctx) {
      var c = size / 2, step = r < 10 ? 1 : 2;
      for (var y = 0; y < size; y += step) {
        for (var x = 0; x < size; x += step) {
          var dx = x + step / 2 - c, dy = y + step / 2 - c;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d > r + 1) continue;
          var shade = d > r - 1 ? T.ink : (dy > r * 0.45 || dx > r * 0.6 ? cols[2] : cols[1]);
          if (d < r - 2 && dx < -r * 0.12 && dx > -r * 0.68 && dy < -r * 0.14 && dy > -r * 0.68) shade = cols[0];
          if (dx < -r * 0.22 && dx > -r * 0.52 && dy < -r * 0.3 && dy > -r * 0.58) shade = T.white;
          ctx.fillStyle = shade; ctx.fillRect(x, y, step, step);
        }
      }
    });
  };

  // Gema (rombo facetado) — se mueve en diagonal sin gravedad
  G.gemImg = function (color, r) {
    var cols = G.BALL_COLORS[color] || G.BALL_COLORS.cyan;
    var size = r * 2 + 6;
    return cached('gem_' + color + '_' + r, size, size, function (ctx) {
      var c = size / 2;
      var n = 6, pts = [];
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 - Math.PI / 2;
        pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
      }
      var inner = r * 0.48;
      var ip = [];
      for (var j = 0; j < n; j++) {
        var b = (j / n) * Math.PI * 2 - Math.PI / 2;
        ip.push([c + Math.cos(b) * inner, c + Math.sin(b) * inner]);
      }
      var shades = [0.55, 0.3, -0.1, -0.4, -0.2, 0.15];
      for (var k = 0; k < n; k++) {
        var k2 = (k + 1) % n;
        ctx.beginPath();
        ctx.moveTo(pts[k][0], pts[k][1]);
        ctx.lineTo(pts[k2][0], pts[k2][1]);
        ctx.lineTo(ip[k2][0], ip[k2][1]);
        ctx.lineTo(ip[k][0], ip[k][1]);
        ctx.closePath();
        ctx.fillStyle = SP.shade(cols[1], shades[k]);
        ctx.fill();
      }
      ctx.beginPath();
      for (var m = 0; m < n; m++) ctx[m ? 'lineTo' : 'moveTo'](ip[m][0], ip[m][1]);
      ctx.closePath();
      var g = ctx.createLinearGradient(c - inner, c - inner, c + inner, c + inner);
      g.addColorStop(0, cols[0]);
      g.addColorStop(1, cols[1]);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      for (var q = 0; q < n; q++) ctx[q ? 'lineTo' : 'moveTo'](pts[q][0], pts[q][1]);
      ctx.closePath();
      ctx.lineWidth = r > 10 ? 2 : 1.4;
      ctx.strokeStyle = '#10081a';
      ctx.stroke();
      G.sparkle(ctx, c - r * 0.25, c - r * 0.3, r * 0.28, '#fff', 0.9);
    });
  };

  // ---------- Nota musical (partícula) ----------
  G.noteImg = function (color, kind) {
    return cached('note_' + color + '_' + kind, 16, 20, function (ctx) {
      ctx.fillStyle = color;
      ctx.strokeStyle = '#10081a';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (kind === 1) {
        // corchea doble
        ctx.moveTo(4, 15); ctx.lineTo(4, 4); ctx.lineTo(13, 2); ctx.lineTo(13, 13);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(13, 2); ctx.lineTo(13, 5); ctx.lineTo(4, 7); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(3.5, 15.5, 3, 2.2, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(12.5, 13.5, 3, 2.2, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.moveTo(9, 15); ctx.lineTo(9, 2);
        ctx.quadraticCurveTo(10, 6, 14, 8);
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(6.5, 15.5, 3.6, 2.6, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    });
  };

  // ---------- Íconos de ítems ----------
  // Cápsulas cuadradas: se distinguen de las burbujas incluso a baja resolución.
  function badge(ctx, cx, cy, r, col) {
    ctx.fillStyle = T.ink; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = col; ctx.fillRect(cx - r + 2, cy - r + 2, r * 2 - 4, r * 2 - 4);
    ctx.fillStyle = T.white; ctx.fillRect(cx - r + 3, cy - r + 3, r * 2 - 6, 2);
  }
  function gloss() { /* El arte arcade usa colores planos. */ }

  function wave(ctx, x, y0, y1, amp, wl, col, lw) {
    ctx.beginPath();
    for (var y = y1; y >= y0; y -= 1) {
      var xx = x + Math.sin((y / wl) * Math.PI * 2) * amp;
      if (y === y1) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  var ICONS = {
    double: function (ctx) {
      badge(ctx, 14, 14, 12, '#2a7cf0');
      ctx.lineCap = 'round';
      wave(ctx, 10, 5, 23, 1.6, 7, '#0a0612', 3.5);
      wave(ctx, 18, 5, 23, 1.6, 7, '#0a0612', 3.5);
      wave(ctx, 10, 5, 23, 1.6, 7, '#c8fbff', 2);
      wave(ctx, 18, 5, 23, 1.6, 7, '#c8fbff', 2);
      gloss(ctx, 14, 14, 12);
    },
    sticky: function (ctx) {
      badge(ctx, 14, 14, 12, '#f0a800');
      ctx.lineCap = 'round';
      wave(ctx, 14, 9, 23, 1.6, 7, '#0a0612', 3.5);
      wave(ctx, 14, 9, 23, 1.6, 7, '#fff6c8', 2);
      ctx.fillStyle = '#fff6c8';
      ctx.strokeStyle = '#0a0612';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(7, 9); ctx.lineTo(21, 9); ctx.lineTo(19, 5); ctx.lineTo(9, 5); ctx.closePath();
      ctx.fill(); ctx.stroke();
      gloss(ctx, 14, 14, 12);
    },
    vulcan: function (ctx) {
      badge(ctx, 14, 14, 12, '#e82a3a');
      ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var y = 20 - i * 6;
        ctx.beginPath();
        ctx.arc(14, y + 6, 6 + i * 0.5, Math.PI * 1.22, Math.PI * 1.78);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0a0612';
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffe2c8';
        ctx.stroke();
      }
      gloss(ctx, 14, 14, 12);
    },
    shield: function (ctx) {
      var g = ctx.createRadialGradient(10, 9, 1, 14, 14, 14);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.35, 'rgba(120,230,255,0.75)');
      g.addColorStop(1, 'rgba(20,110,220,0.85)');
      ctx.beginPath(); ctx.arc(14, 14, 12, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#0a2a5a'; ctx.stroke();
      G.star(ctx, 14, 15, 6, 2.6, 5, 0);
      ctx.fillStyle = '#fff5a0'; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#6a4a00'; ctx.stroke();
      gloss(ctx, 14, 14, 12);
    },
    clock: function (ctx) {
      ctx.fillStyle = '#0a0612';
      ctx.beginPath(); ctx.arc(7, 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(21, 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd21e';
      ctx.beginPath(); ctx.arc(7, 5, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(21, 5, 2.6, 0, Math.PI * 2); ctx.fill();
      badge(ctx, 14, 15, 11, '#ffc81e');
      ctx.beginPath(); ctx.arc(14, 15, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#fffdf0'; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#6a4a00'; ctx.stroke();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, 15); ctx.lineTo(14, 9.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 15); ctx.lineTo(18, 17); ctx.stroke();
      gloss(ctx, 14, 15, 11);
    },
    hourglass: function (ctx) {
      ctx.fillStyle = '#8a4a1a'; ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 1.5;
      G.roundRect(ctx, 5, 2, 18, 4, 1.5); ctx.fill(); ctx.stroke();
      G.roundRect(ctx, 5, 22, 18, 4, 1.5); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 6); ctx.lineTo(20, 6); ctx.lineTo(15.5, 14); ctx.lineTo(20, 22); ctx.lineTo(8, 22); ctx.lineTo(12.5, 14); ctx.closePath();
      ctx.fillStyle = 'rgba(200,240,255,0.85)'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffcf4a';
      ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(18, 8); ctx.lineTo(14, 13); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(18.5, 21); ctx.lineTo(9.5, 21); ctx.closePath(); ctx.fill();
    },
    dynamite: function (ctx) {
      ctx.save();
      ctx.translate(14, 15);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#e8262a'; ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 1.6;
      G.roundRect(ctx, -5, -10, 10, 20, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(-3, -8, 2.5, 16);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-5, -3, 10, 2.5);
      ctx.restore();
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(18, 6); ctx.quadraticCurveTo(22, 2, 24, 4); ctx.stroke();
      G.sparkle(ctx, 24, 4, 4.5, '#ffe14a', 1);
      G.sparkle(ctx, 24, 4, 2.2, '#fff', 1);
    },
    oneup: function (ctx) {
      badge(ctx, 14, 14, 12, '#2fc63a');
      G.text(ctx, '1UP', 14, 15, { size: 9, font: SP.FONT.pixel, color: '#fff', stroke: '#0a0612', strokeW: 3 });
      gloss(ctx, 14, 14, 12);
    },
    battery: function (ctx) {
      ctx.fillStyle = '#2a2a36'; ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 1.6;
      G.roundRect(ctx, 4, 8, 19, 13, 2.5); ctx.fill(); ctx.stroke();
      ctx.fillRect(23, 12, 3, 5);
      var g = ctx.createLinearGradient(0, 9, 0, 20);
      g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffc81e'); g.addColorStop(1, '#b87800');
      ctx.fillStyle = g;
      ctx.fillRect(6, 10, 15, 9);
      ctx.fillStyle = '#0a0612';
      ctx.beginPath(); ctx.moveTo(15, 9); ctx.lineTo(10, 15); ctx.lineTo(13.5, 15); ctx.lineTo(12, 20); ctx.lineTo(18, 13.5); ctx.lineTo(14.5, 13.5); ctx.closePath(); ctx.fill();
    },
    cassette: function (ctx) {
      ctx.fillStyle = '#2b2b3a'; ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 1.6;
      G.roundRect(ctx, 2, 6, 24, 16, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff6a2a'; ctx.fillRect(5, 8, 18, 7);
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(5, 9, 18, 2);
      ctx.fillStyle = '#ddd';
      ctx.beginPath(); ctx.arc(9.5, 15, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(18.5, 15, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2b3a';
      ctx.beginPath(); ctx.arc(9.5, 15, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(18.5, 15, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a4a5c'; ctx.fillRect(8, 19, 12, 3);
    },
    cd: function (ctx) {
      var g = ctx.createLinearGradient(2, 2, 26, 26);
      g.addColorStop(0, '#f4f4ff'); g.addColorStop(0.25, '#ffb0e8'); g.addColorStop(0.45, '#b0f0ff');
      g.addColorStop(0.65, '#fff7a0'); g.addColorStop(0.85, '#c8b0ff'); g.addColorStop(1, '#e8e8f4');
      ctx.beginPath(); ctx.arc(14, 14, 12, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#0a0612'; ctx.stroke();
      ctx.beginPath(); ctx.arc(14, 14, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#d0d4e0'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(14, 14, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0612'; ctx.fill();
      G.sparkle(ctx, 8, 9, 3.5, '#fff', 0.9);
    },
    vinyl: function (ctx) {
      ctx.beginPath(); ctx.arc(14, 14, 12.5, 0, Math.PI * 2);
      ctx.fillStyle = '#15151c'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.8;
      for (var i = 6; i < 12; i += 2) { ctx.beginPath(); ctx.arc(14, 14, i, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(14, 14, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#e8262a'; ctx.fill();
      ctx.beginPath(); ctx.arc(14, 14, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(14, 14, 11, -2.4, -1.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    },
    goldnote: function (ctx) {
      ctx.save();
      ctx.translate(2, 2);
      ctx.scale(1.5, 1.2);
      ctx.fillStyle = '#ffd21e';
      ctx.strokeStyle = '#5a3a00';
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(4, 15); ctx.lineTo(4, 4); ctx.lineTo(13, 2); ctx.lineTo(13, 13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(13, 2); ctx.lineTo(13, 5); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(3.5, 15.5, 3, 2.2, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(12.5, 13.5, 3, 2.2, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      G.sparkle(ctx, 22, 6, 4, '#fff', 1);
    }
  };
  G.ITEM_IDS = Object.keys(ICONS);
  G.itemImg = function (type) {
    return cached('item_' + type, 28, 28, function (ctx) {
      (ICONS[type] || ICONS.cd)(ctx);
    });
  };

  // ---------- Pixel art ----------
  G.drawPixel = function (ctx, img, x, y, scale, flip, alpha) {
    if (!img) return;
    var w = img.width * scale, h = img.height * scale;
    var prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    if (alpha !== undefined) { ctx.save(); ctx.globalAlpha *= alpha; }
    if (flip) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    if (alpha !== undefined) ctx.restore();
    ctx.imageSmoothingEnabled = prev;
  };

  // ---------- Fondo de rayas diagonales (menús) ----------
  G.stripes = function (ctx, x, y, w, h, c1, c2, size, offset) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = c1;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c2;
    var s = size || 24;
    var o = (offset || 0) % (s * 2);
    for (var i = -h - s * 2; i < w + s * 2; i += s * 2) {
      ctx.beginPath();
      ctx.moveTo(x + i + o, y);
      ctx.lineTo(x + i + o + s, y);
      ctx.lineTo(x + i + o + s + h, y + h);
      ctx.lineTo(x + i + o + h, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  // Líneas de TV (opcional)
  G.scanlines = function (ctx) {
    var c = cached('scan', SP.W, SP.H, function (x) {
      x.fillStyle = 'rgba(2,6,18,0.12)';
      for (var y = 0; y < SP.H; y += 3) x.fillRect(0, y, SP.W, 1);
    });
    ctx.drawImage(c, 0, 0, SP.W, SP.H);
  };
})();
