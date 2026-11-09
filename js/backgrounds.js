/* =========================================================
   SONIC PANG — fondos procedurales de los 6 mundos
   Capa estática (se pinta una vez en caché) + capa animada.
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var G = SP.gfx;
  var BW = 640, BH = 416;

  SP.WORLDS = [
    { id: 'barrio', name: 'BARRIO', sub: 'Atardecer en la cuadra', accent: '#ff9a3c', balls: ['red', 'orange', 'yellow', 'pink'] },
    { id: 'playa', name: 'PLAYA', sub: 'Sol, arena y burbujas', accent: '#2bc4e0', balls: ['blue', 'cyan', 'yellow', 'green'] },
    { id: 'ciudad', name: 'CIUDAD', sub: 'Azoteas a medianoche', accent: '#8a6aff', balls: ['purple', 'cyan', 'pink', 'yellow'] },
    { id: 'desierto', name: 'DESIERTO', sub: 'La carretera al ocaso', accent: '#ff6a3d', balls: ['orange', 'red', 'purple', 'yellow'] },
    { id: 'antro', name: 'ANTRO', sub: 'Pista de baile neón', accent: '#ff4fb0', balls: ['pink', 'cyan', 'purple', 'green'] },
    { id: 'espacio', name: 'ESPACIO', sub: 'El concierto final', accent: '#18d0d0', balls: ['cyan', 'purple', 'blue', 'pink'] }
  ];

  function vgrad(ctx, y0, y1, stops) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) {
      g.addColorStop(stops[i][0], stops[i][1]);
      if (i + 1 < stops.length) g.addColorStop(Math.max(stops[i][0], stops[i + 1][0] - 0.001), stops[i][1]);
    }
    return g;
  }
  function glow(ctx, x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, SP.alpha(color, a));
    g.addColorStop(1, SP.alpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function cloud(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 18 * s, y - 6 * s, 16 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10 * s, y - 10 * s, 20 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function palm(ctx, x, y, h, color, lean) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.5, x + lean, y - h);
    ctx.stroke();
    var tx = x + lean, ty = y - h;
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI / 2 + (i - 3) * 0.5;
      var len = 40 + (i % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      var ex = tx + Math.cos(a) * len * 1.2, ey = ty + Math.sin(a) * len * 0.5 + 18;
      ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.7 - 10, ex, ey);
      ctx.lineWidth = 6 - Math.abs(i - 3) * 0.6;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(tx, ty + 3, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  function cactus(ctx, x, y, h, color) {
    ctx.fillStyle = color;
    G.roundRect(ctx, x - 7, y - h, 14, h, 7);
    ctx.fill();
    G.roundRect(ctx, x - 24, y - h * 0.62, 10, h * 0.32, 5);
    ctx.fill();
    ctx.fillRect(x - 18, y - h * 0.38, 14, 8);
    G.roundRect(ctx, x + 14, y - h * 0.78, 10, h * 0.36, 5);
    ctx.fill();
    ctx.fillRect(x + 4, y - h * 0.5, 14, 8);
  }
  function speaker(ctx, x, y, w, h) {
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    var n = Math.max(1, Math.floor(h / w));
    for (var i = 0; i < n; i++) {
      var cy = y + (h / n) * (i + 0.5), r = Math.min(w, h / n) * 0.36;
      var g = ctx.createRadialGradient(x + w / 2 - r * 0.3, cy - r * 0.3, 1, x + w / 2, cy, r);
      g.addColorStop(0, '#5a5a70');
      g.addColorStop(0.6, '#1c1c28');
      g.addColorStop(1, '#050508');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + w / 2, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3a4c';
      ctx.beginPath();
      ctx.arc(x + w / 2, cy, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ----- Capas estáticas -----
  var STATIC = {
    barrio: function (ctx, rng) {
      ctx.fillStyle = vgrad(ctx, 0, 330, [[0, '#2a1758'], [0.45, '#a8357c'], [0.78, '#ff7b46'], [1, '#ffc35a']]);
      ctx.fillRect(0, 0, BW, BH);
      // sol retro con franjas
      glow(ctx, 470, 270, 160, '#ffd27a', 0.55);
      ctx.save();
      ctx.beginPath();
      ctx.arc(470, 270, 70, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = vgrad(ctx, 200, 340, [[0, '#fff3a0'], [1, '#ff6a3d']]);
      ctx.fillRect(400, 200, 140, 140);
      ctx.fillStyle = '#e9566e';
      for (var i = 0; i < 5; i++) ctx.fillRect(400, 268 + i * 12, 140, 3 + i * 1.2);
      ctx.restore();
      // nubes
      for (var c = 0; c < 6; c++) cloud(ctx, rng() * BW, 40 + rng() * 140, 0.6 + rng() * 0.9, 'rgba(255,170,190,' + (0.18 + rng() * 0.25) + ')');
      // casas al fondo
      var x = -10;
      while (x < BW) {
        var w = 50 + rng() * 60, h = 50 + rng() * 60, base = 352;
        ctx.fillStyle = '#4a2156';
        ctx.fillRect(x, base - h, w, h);
        ctx.beginPath();
        ctx.moveTo(x - 6, base - h);
        ctx.lineTo(x + w / 2, base - h - 24 - rng() * 14);
        ctx.lineTo(x + w + 6, base - h);
        ctx.fill();
        for (var wy = base - h + 12; wy < base - 16; wy += 18) {
          for (var wx = x + 8; wx < x + w - 14; wx += 16) {
            if (rng() < 0.45) {
              ctx.fillStyle = rng() < 0.5 ? '#ffd27a' : '#ffb15a';
              ctx.fillRect(wx, wy, 8, 9);
            }
          }
        }
        x += w + 6 + rng() * 14;
      }
      // postes y cables
      ctx.strokeStyle = '#23102e';
      ctx.lineWidth = 4;
      for (var p = 60; p < BW; p += 200) {
        ctx.beginPath(); ctx.moveTo(p, 360); ctx.lineTo(p, 150); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p - 18, 162); ctx.lineTo(p + 18, 162); ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      for (var l = 0; l < 3; l++) {
        ctx.beginPath();
        for (var q = 60; q < BW; q += 200) {
          ctx.moveTo(q - 14 + l * 14, 162);
          ctx.quadraticCurveTo(q + 100, 190 + l * 4, q + 186 + l * 14, 162);
        }
        ctx.stroke();
      }
      palm(ctx, 120, 360, 170, '#1d0b25', 26);
      palm(ctx, 590, 360, 140, '#1d0b25', -20);
      // barda y banqueta
      ctx.fillStyle = vgrad(ctx, 352, 416, [[0, '#3a2a48'], [1, '#1d1426']]);
      ctx.fillRect(0, 352, BW, 64);
      ctx.fillStyle = '#5a4466';
      for (var bx = 0; bx < BW; bx += 32) ctx.fillRect(bx, 352, 30, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (var by = 360; by < 404; by += 14) for (var bx2 = (by / 14) % 2 ? 0 : 16; bx2 < BW; bx2 += 32) ctx.fillRect(bx2, by, 30, 12);
    },

    playa: function (ctx, rng) {
      ctx.fillStyle = vgrad(ctx, 0, 250, [[0, '#2b8cf0'], [0.7, '#8fd4ff'], [1, '#d4f2ff']]);
      ctx.fillRect(0, 0, BW, BH);
      glow(ctx, 520, 70, 140, '#fff7c0', 0.7);
      ctx.fillStyle = '#fff7c8';
      ctx.beginPath(); ctx.arc(520, 70, 38, 0, Math.PI * 2); ctx.fill();
      for (var c = 0; c < 5; c++) cloud(ctx, rng() * BW, 40 + rng() * 120, 0.8 + rng() * 0.8, 'rgba(255,255,255,0.85)');
      // isla lejana
      ctx.fillStyle = '#5aa0b8';
      ctx.beginPath(); ctx.ellipse(150, 252, 90, 22, 0, Math.PI, 0); ctx.fill();
      // mar
      ctx.fillStyle = vgrad(ctx, 250, 330, [[0, '#1a78c8'], [1, '#33d0de']]);
      ctx.fillRect(0, 250, BW, 80);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (var y = 262; y < 330; y += 12) {
        for (var x = (y * 7) % 60; x < BW; x += 70 + rng() * 40) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + rng() * 14, y); ctx.stroke();
        }
      }
      // espuma
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 330);
      for (var fx = 0; fx <= BW; fx += 20) ctx.quadraticCurveTo(fx + 10, 322 + rng() * 6, fx + 20, 330);
      ctx.lineTo(BW, 338); ctx.lineTo(0, 338); ctx.fill();
      // arena
      ctx.fillStyle = vgrad(ctx, 334, 416, [[0, '#ffe2a0'], [1, '#e8b25a']]);
      ctx.fillRect(0, 334, BW, 82);
      ctx.fillStyle = 'rgba(160,100,40,0.25)';
      for (var d = 0; d < 140; d++) ctx.fillRect(rng() * BW, 340 + rng() * 70, 2, 2);
      // sombrilla
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(470, 392); ctx.lineTo(486, 290); ctx.stroke();
      var cols = ['#ff3b5c', '#ffffff'];
      for (var s = 0; s < 6; s++) {
        ctx.fillStyle = cols[s % 2];
        ctx.beginPath();
        ctx.moveTo(486, 286);
        ctx.arc(486, 300, 62, Math.PI + s * (Math.PI / 6), Math.PI + (s + 1) * (Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      palm(ctx, 70, 392, 200, '#2c5a1e', 30);
      palm(ctx, 600, 392, 160, '#2c5a1e', -26);
      ctx.fillStyle = '#ff7a9a';
      ctx.beginPath(); ctx.arc(250, 384, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff1d0';
      ctx.beginPath(); ctx.ellipse(330, 394, 6, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    },

    ciudad: function (ctx, rng) {
      ctx.fillStyle = vgrad(ctx, 0, 330, [[0, '#04051a'], [0.6, '#1a1050'], [1, '#43206e']]);
      ctx.fillRect(0, 0, BW, BH);
      for (var s = 0; s < 120; s++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + rng() * 0.7) + ')';
        var sz = rng() < 0.1 ? 2 : 1;
        ctx.fillRect(rng() * BW, rng() * 240, sz, sz);
      }
      glow(ctx, 120, 80, 110, '#cfd8ff', 0.35);
      ctx.fillStyle = '#eef0ff';
      ctx.beginPath(); ctx.arc(120, 80, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(160,170,210,0.5)';
      ctx.beginPath(); ctx.arc(110, 72, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(130, 92, 5, 0, Math.PI * 2); ctx.fill();
      var layers = [['#1a1c4a', 0.35, 250], ['#11123a', 0.6, 290], ['#0a0b26', 1, 330]];
      layers.forEach(function (L) {
        var x = -20;
        while (x < BW) {
          var w = 40 + rng() * 60, h = 60 + rng() * 140 * L[1];
          var top = L[2] - h + 40;
          ctx.fillStyle = L[0];
          ctx.fillRect(x, top, w, BH);
          if (rng() < 0.4) { ctx.fillRect(x + w / 2 - 1, top - 20, 2, 20); }
          for (var wy = top + 8; wy < 380; wy += 12) {
            for (var wx = x + 5; wx < x + w - 6; wx += 9) {
              if (rng() < 0.28 * L[1]) {
                ctx.fillStyle = rng() < 0.75 ? 'rgba(255,214,120,' + (0.4 + L[1] * 0.5) + ')' : 'rgba(120,220,255,0.7)';
                ctx.fillRect(wx, wy, 5, 6);
              }
            }
          }
          x += w + 4 + rng() * 10;
        }
      });
      // azotea
      ctx.fillStyle = vgrad(ctx, 360, 416, [[0, '#262640'], [1, '#121222']]);
      ctx.fillRect(0, 360, BW, 56);
      ctx.fillStyle = '#3a3a5c';
      ctx.fillRect(0, 358, BW, 4);
      // tinaco y clima
      ctx.fillStyle = '#16162a';
      ctx.fillRect(510, 300, 70, 60);
      ctx.fillRect(520, 290, 50, 10);
      ctx.fillRect(40, 330, 60, 30);
      ctx.strokeStyle = '#2c2c48'; ctx.lineWidth = 2;
      for (var v = 44; v < 96; v += 6) { ctx.beginPath(); ctx.moveTo(v, 334); ctx.lineTo(v, 356); ctx.stroke(); }
    },

    desierto: function (ctx, rng) {
      ctx.fillStyle = vgrad(ctx, 0, 300, [[0, '#120630'], [0.45, '#6a1b6e'], [0.8, '#ff5e48'], [1, '#ffc04a']]);
      ctx.fillRect(0, 0, BW, BH);
      for (var s = 0; s < 70; s++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + rng() * 0.6) + ')';
        ctx.fillRect(rng() * BW, rng() * 140, 1, 1);
      }
      glow(ctx, 320, 300, 200, '#ffb04a', 0.5);
      ctx.save();
      ctx.beginPath(); ctx.arc(320, 300, 92, Math.PI, 0); ctx.closePath(); ctx.clip();
      ctx.fillStyle = vgrad(ctx, 208, 300, [[0, '#fff26a'], [1, '#ff3d7a']]);
      ctx.fillRect(220, 200, 200, 100);
      ctx.fillStyle = '#7a1b5e';
      for (var i = 0; i < 6; i++) ctx.fillRect(220, 250 + i * 9, 200, 2 + i);
      ctx.restore();
      // mesetas
      ctx.fillStyle = '#4a1450';
      ctx.beginPath();
      ctx.moveTo(0, 300); ctx.lineTo(30, 300); ctx.lineTo(50, 240); ctx.lineTo(150, 236); ctx.lineTo(170, 300);
      ctx.lineTo(430, 300); ctx.lineTo(450, 256); ctx.lineTo(520, 252); ctx.lineTo(540, 300); ctx.lineTo(BW, 300);
      ctx.lineTo(BW, 310); ctx.lineTo(0, 310); ctx.fill();
      // suelo
      ctx.fillStyle = vgrad(ctx, 300, 416, [[0, '#5a1e46'], [1, '#2a0c26']]);
      ctx.fillRect(0, 300, BW, 116);
      // carretera en perspectiva
      ctx.fillStyle = '#1a0a1c';
      ctx.beginPath(); ctx.moveTo(300, 300); ctx.lineTo(340, 300); ctx.lineTo(480, 416); ctx.lineTo(160, 416); ctx.fill();
      ctx.fillStyle = '#ffcf5a';
      for (var k = 0; k < 6; k++) {
        var t0 = k / 6, t1 = t0 + 0.06;
        var y0 = 300 + Math.pow(t0, 1.6) * 116, y1 = 300 + Math.pow(t1, 1.6) * 116;
        var w0 = 1 + t0 * 6, w1 = 1 + t1 * 6;
        ctx.beginPath(); ctx.moveTo(320 - w0 / 2, y0); ctx.lineTo(320 + w0 / 2, y0); ctx.lineTo(320 + w1 / 2, y1); ctx.lineTo(320 - w1 / 2, y1); ctx.fill();
      }
      cactus(ctx, 80, 392, 110, '#1c0820');
      cactus(ctx, 560, 380, 80, '#1c0820');
      cactus(ctx, 230, 318, 30, '#3a1036');
    },

    antro: function (ctx, rng) {
      ctx.fillStyle = vgrad(ctx, 0, 416, [[0, '#0b0216'], [0.7, '#250636'], [1, '#12021c']]);
      ctx.fillRect(0, 0, BW, BH);
      // pared con paneles
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var px = 0; px < BW; px += 40) ctx.fillRect(px, 0, 1, 300);
      // pista de baile en perspectiva (losetas se iluminan en la capa animada)
      ctx.fillStyle = '#12051e';
      ctx.fillRect(0, 300, BW, 116);
      // bocinas laterales
      speaker(ctx, 14, 170, 70, 190);
      speaker(ctx, 556, 170, 70, 190);
      speaker(ctx, 90, 250, 50, 110);
      speaker(ctx, 500, 250, 50, 110);
      // letrero neón (estático tenue; el brillo se anima)
      ctx.strokeStyle = 'rgba(255,79,176,0.25)';
      ctx.lineWidth = 6;
      G.roundRect(ctx, 220, 40, 200, 70, 14);
      ctx.stroke();
      G.text(ctx, 'SONIC', 320, 76, { size: 20, font: SP.FONT.pixel, color: 'rgba(120,220,240,0.35)' });
      // losetas de la pista (versión apagada)
      var tcols = ['#ff4fb0', '#18d0d0', '#a03ae6', '#ffc81e'];
      for (var row = 0; row < 4; row++) {
        var y0 = 300 + row * 26, y1 = y0 + 26;
        for (var col = -6; col < 7; col++) {
          var xa = 320 + col * (44 + row * 12), xb = 320 + (col + 1) * (44 + row * 12);
          var xc = 320 + (col + 1) * (44 + (row + 1) * 12), xd = 320 + col * (44 + (row + 1) * 12);
          ctx.fillStyle = SP.alpha(tcols[(row + col + 8) % 4], 0.16);
          ctx.beginPath();
          ctx.moveTo(xa + 1, y0 + 1); ctx.lineTo(xb - 1, y0 + 1); ctx.lineTo(xc - 1, y1 - 1); ctx.lineTo(xd + 1, y1 - 1);
          ctx.fill();
        }
      }
      // bolas disco colgando del techo
      [[110, 70, 16], [530, 56, 20]].forEach(function (d) {
        ctx.strokeStyle = '#3a2a4a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d[0], 0); ctx.lineTo(d[0], d[1] - d[2]); ctx.stroke();
        var g = ctx.createRadialGradient(d[0] - d[2] * 0.3, d[1] - d[2] * 0.3, 1, d[0], d[1], d[2]);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#a0a6c4'); g.addColorStop(1, '#3a3e58');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (var fy = -d[2]; fy < d[2]; fy += 5) {
          for (var fx = -d[2]; fx < d[2]; fx += 5) {
            if (fx * fx + fy * fy < d[2] * d[2] * 0.8 && rng() < 0.5) ctx.fillRect(d[0] + fx, d[1] + fy, 3, 3);
          }
        }
      });
    },

    espacio: function (ctx, rng) {
      ctx.fillStyle = vgrad(ctx, 0, 416, [[0, '#02000c'], [0.6, '#0e0228'], [1, '#1a0436']]);
      ctx.fillRect(0, 0, BW, BH);
      // nebulosas
      glow(ctx, 160, 120, 200, '#7a2aff', 0.28);
      glow(ctx, 470, 200, 220, '#18d0d0', 0.18);
      glow(ctx, 330, 60, 160, '#ff4fb0', 0.15);
      for (var s = 0; s < 160; s++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + rng() * 0.6) + ')';
        ctx.fillRect(rng() * BW, rng() * 330, 1, 1);
      }
      // planeta con anillos
      var g = ctx.createRadialGradient(470, 100, 4, 490, 120, 60);
      g.addColorStop(0, '#ffd2a0'); g.addColorStop(0.6, '#e2604a'); g.addColorStop(1, '#4a1030');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(490, 120, 50, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,180,0.6)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(490, 124, 88, 18, -0.25, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = g;
      ctx.save(); ctx.beginPath(); ctx.rect(400, 60, 180, 64); ctx.clip();
      ctx.beginPath(); ctx.arc(490, 120, 50, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // luna pequeña
      ctx.fillStyle = '#9aa0c8';
      ctx.beginPath(); ctx.arc(110, 200, 16, 0, Math.PI * 2); ctx.fill();
      // escenario flotante
      ctx.fillStyle = vgrad(ctx, 360, 416, [[0, '#4a4a6a'], [0.15, '#2a2a40'], [1, '#101020']]);
      ctx.beginPath(); ctx.moveTo(0, 364); ctx.lineTo(BW, 364); ctx.lineTo(BW, 416); ctx.lineTo(0, 416); ctx.fill();
      ctx.fillStyle = '#7a7aa0';
      ctx.fillRect(0, 362, BW, 3);
    }
  };

  // ----- Capas animadas -----
  var DYN = {
    barrio: function (ctx, t) {
      ctx.fillStyle = 'rgba(255,190,200,0.16)';
      for (var i = 0; i < 3; i++) {
        var x = ((t * (8 + i * 4) + i * 260) % (BW + 200)) - 100;
        cloud(ctx, x, 60 + i * 40, 1 + i * 0.2, 'rgba(255,190,210,0.14)');
      }
    },
    playa: function (ctx, t) {
      for (var i = 0; i < 14; i++) {
        var a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        G.sparkle(ctx, (i * 53 + 20) % BW, 262 + (i * 37) % 60, 2 + a * 3, '#fff', a * 0.9);
      }
      var cx = ((t * 10) % (BW + 200)) - 100;
      cloud(ctx, cx, 50, 1.2, 'rgba(255,255,255,0.5)');
    },
    ciudad: function (ctx, t) {
      for (var i = 0; i < 6; i++) {
        var on = Math.sin(t * 2.5 + i * 2) > 0.3;
        if (on) glow(ctx, 60 + i * 105, 120 + (i % 3) * 40, 8, '#ff3030', 0.9);
      }
      for (var s = 0; s < 18; s++) {
        var a = 0.5 + 0.5 * Math.sin(t * 2 + s * 3.1);
        ctx.fillStyle = 'rgba(255,255,255,' + a * 0.8 + ')';
        ctx.fillRect((s * 97) % BW, (s * 53) % 220, 2, 2);
      }
    },
    desierto: function (ctx, t) {
      for (var s = 0; s < 12; s++) {
        var a = 0.5 + 0.5 * Math.sin(t * 1.6 + s * 2.3);
        ctx.fillStyle = 'rgba(255,240,255,' + a * 0.7 + ')';
        ctx.fillRect((s * 131) % BW, (s * 29) % 120, 2, 2);
      }
    },
    antro: function (ctx, t, lv) {
      var beat = SP.audio.beat();
      var ph = beat % 1;
      // haces de luz giratorios
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var cols = ['#ff4fb0', '#18d0d0', '#a03ae6', '#ffc81e'];
      for (var i = 0; i < 4; i++) {
        var a = Math.sin(t * 0.8 + i * 1.6) * 0.7 + Math.PI / 2;
        var x0 = 120 + i * 130;
        var g = ctx.createLinearGradient(x0, 0, x0 + Math.cos(a) * 420, Math.sin(a) * 420);
        g.addColorStop(0, SP.alpha(cols[i], 0.22));
        g.addColorStop(1, SP.alpha(cols[i], 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + Math.cos(a - 0.12) * 460, Math.sin(a - 0.12) * 460);
        ctx.lineTo(x0 + Math.cos(a + 0.12) * 460, Math.sin(a + 0.12) * 460);
        ctx.fill();
      }
      ctx.restore();
      // letrero de neón
      var flick = Math.sin(t * 40) > -0.95 ? 1 : 0.3;
      ctx.save();
      ctx.shadowColor = '#ff4fb0';
      ctx.shadowBlur = 18 * flick;
      ctx.strokeStyle = SP.alpha('#ff7ac8', 0.9 * flick);
      ctx.lineWidth = 3;
      G.roundRect(ctx, 220, 40, 200, 70, 14);
      ctx.stroke();
      ctx.restore();
      G.text(ctx, 'SONIC', 320, 76, { size: 20, font: SP.FONT.pixel, color: SP.alpha('#9ff6ff', 0.95 * flick), stroke: SP.alpha('#18d0d0', 0.5), strokeW: 6 });
      // ecualizador en la pared
      var levels = SP.audio.levels(16, lv);
      for (var b = 0; b < 16; b++) {
        var h = 8 + levels[b] * 110;
        for (var k = 0; k < h; k += 7) {
          var c = k > 80 ? '#ff4f6a' : k > 50 ? '#ffc81e' : '#2fe07a';
          ctx.fillStyle = SP.alpha(c, 0.5);
          ctx.fillRect(166 + b * 19, 290 - k, 15, 5);
        }
      }
      // pista: losetas que siguen el ritmo
      for (var row = 0; row < 4; row++) {
        var y0 = 300 + row * 26, y1 = y0 + 26;
        for (var col = -6; col < 7; col++) {
          var on = ((row + col + Math.floor(beat)) % 3 === 0);
          var hue = cols[(row + col + 8) % 4];
          var xa = 320 + col * (44 + row * 12), xb = 320 + (col + 1) * (44 + row * 12);
          var xc = 320 + (col + 1) * (44 + (row + 1) * 12), xd = 320 + col * (44 + (row + 1) * 12);
          ctx.fillStyle = on ? SP.alpha(hue, 0.55 - ph * 0.3) : 'rgba(40,10,60,0.6)';
          ctx.beginPath();
          ctx.moveTo(xa + 1, y0 + 1); ctx.lineTo(xb - 1, y0 + 1); ctx.lineTo(xc - 1, y1 - 1); ctx.lineTo(xd + 1, y1 - 1);
          ctx.fill();
        }
      }
    },
    espacio: function (ctx, t) {
      for (var i = 0; i < 40; i++) {
        var sp = 6 + (i % 3) * 8;
        var x = (i * 89 + t * sp) % BW;
        var y = (i * 61) % 340;
        var a = 0.4 + 0.4 * Math.sin(t * 2 + i);
        ctx.fillStyle = 'rgba(200,230,255,' + a + ')';
        ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
      }
      var cyc = (t % 7) / 7;
      if (cyc < 0.15) {
        var p = cyc / 0.15;
        var sx = 80 + p * 300, sy = 30 + p * 120;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - p) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 40, sy - 16); ctx.stroke();
      }
      // luces del escenario
      for (var l = 0; l < 10; l++) {
        var on = Math.sin(t * 4 + l) > 0;
        ctx.fillStyle = on ? '#18d0d0' : '#2a3a5a';
        ctx.fillRect(20 + l * 64, 370, 24, 4);
      }
    }
  };

  var bgCache = {};
  SP.bg = {
    get: function (id) {
      var key = id;
      if (bgCache[key]) return bgCache[key];
      var c = G.makeCanvas(BW / 2, BH / 2);
      var ctx = c.getContext('2d');
      if (ctx) {
        ctx.scale(0.5, 0.5);
        var rng = SP.makeRng(id.length * 9973 + id.charCodeAt(0) * 31);
        (STATIC[id] || STATIC.barrio)(ctx, rng);
        // viñeta suave para que las bolas resalten
        var v = ctx.createRadialGradient(BW / 2, BH / 2, 120, BW / 2, BH / 2, 460);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, BW, BH);
      }
      bgCache[key] = c;
      return c;
    },
    draw: function (ctx, id, t, dim) {
      var img = this.get(id);
      ctx.drawImage(img, 0, 0, BW, BH);
      if (DYN[id]) {
        this._lv = this._lv || [];
        DYN[id](ctx, SP.reduceMotion ? 0 : t, this._lv);
      }
      if (dim) {
        ctx.fillStyle = 'rgba(0,0,10,' + dim + ')';
        ctx.fillRect(0, 0, BW, BH);
      }
    }
  };
})();
