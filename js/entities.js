/* =========================================================
   SONIC PANG — entidades: bolas, gemas, ondas, ítems,
   bloques, partículas, jugador y jefes
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var G = SP.gfx;
  var PF = SP.PF;
  var E = SP.ent = {};

  E.SIZE_R = [40, 27, 14, 7];
  E.BOUNCE_H = [250, 205, 150, 100];
  E.GRAV = 640;
  E.BALL_VX = 100;
  E.GEM_V = [150, 126, 140, 156];
  E.POINTS = [50, 100, 150, 200];
  E.PLAYER_SPEED = 172;
  E.WIRE_SPEED = 660;

  E.bounceV = function (size, gs) { return Math.sqrt(2 * E.GRAV * gs * E.BOUNCE_H[size]); };

  // =======================================================
  // Bola / gema
  // =======================================================
  function Ball(size, x, y, dir, color, kind) {
    this.size = size;
    this.r = E.SIZE_R[size];
    this.x = x;
    this.y = y;
    this.color = color || 'red';
    this.kind = (kind === 'g' || kind === 'gem') ? 'gem' : 'ball';
    if (this.kind === 'gem') {
      var v = E.GEM_V[size];
      this.vx = (dir || 1) * v;
      this.vy = v * 0.8;
    } else {
      this.vx = (dir || 1) * E.BALL_VX;
      this.vy = 0;
    }
    this.squash = 0;
    this.spawn = 0;
    this.rot = Math.random() * 6;
    this.dead = false;
  }
  Ball.prototype.update = function (dt, game) {
    var gs = game.gravScale;
    if (this.spawn < 1) this.spawn = Math.min(1, this.spawn + dt * 5);
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt);
    if (this.kind === 'gem') this.rot += dt * (this.vx > 0 ? 2.5 : -2.5);
    else this.vy += E.GRAV * gs * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    var r = this.r;
    if (this.x - r < PF.l) { this.x = PF.l + r; this.vx = Math.abs(this.vx); }
    else if (this.x + r > PF.r) { this.x = PF.r - r; this.vx = -Math.abs(this.vx); }
    if (this.y + r > PF.b) {
      this.y = PF.b - r;
      if (this.kind === 'gem') this.vy = -Math.abs(this.vy);
      else { this.vy = -E.bounceV(this.size, gs); this.squash = 0.12; }
    }
    if (this.y - r < PF.t) { this.y = PF.t + r; this.vy = Math.abs(this.vy); }
    var bl = game.blocks;
    for (var i = 0; i < bl.length; i++) if (!bl[i].dead) this.collideBlock(bl[i], gs);
  };
  Ball.prototype.collideBlock = function (b, gs) {
    var r = this.r;
    var cx = SP.clamp(this.x, b.x, b.x + b.w), cy = SP.clamp(this.y, b.y, b.y + b.h);
    var dx = this.x - cx, dy = this.y - cy;
    var d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return;
    var nx, ny, pen;
    if (d2 > 0.0001) {
      var d = Math.sqrt(d2);
      nx = dx / d; ny = dy / d; pen = r - d;
    } else {
      var left = this.x - b.x, right = b.x + b.w - this.x, top = this.y - b.y, bottom = b.y + b.h - this.y;
      var m = Math.min(left, right, top, bottom);
      if (m === top) { nx = 0; ny = -1; pen = top + r; }
      else if (m === bottom) { nx = 0; ny = 1; pen = bottom + r; }
      else if (m === left) { nx = -1; ny = 0; pen = left + r; }
      else { nx = 1; ny = 0; pen = right + r; }
    }
    this.x += nx * pen;
    this.y += ny * pen;
    if (Math.abs(ny) >= Math.abs(nx)) {
      if (ny < 0) {
        if (this.kind === 'gem') this.vy = -Math.abs(this.vy);
        else if (this.vy > 0) { this.vy = -E.bounceV(this.size, gs); this.squash = 0.12; }
      } else {
        this.vy = Math.abs(this.vy);
      }
    } else {
      this.vx = nx > 0 ? Math.abs(this.vx) : -Math.abs(this.vx);
    }
  };
  Ball.prototype.split = function (game) {
    if (this.size >= 3) return [];
    var s = this.size + 1, kids = [];
    for (var k = -1; k <= 1; k += 2) {
      var b = new Ball(s, this.x + k * E.SIZE_R[s] * 0.55, this.y, k, this.color, this.kind);
      if (b.kind === 'gem') b.vy = -Math.abs(b.vy);
      else b.vy = -Math.max(E.bounceV(s, game.gravScale) * 0.62, 260);
      b.spawn = 1;
      b.x = SP.clamp(b.x, PF.l + b.r, PF.r - b.r);
      kids.push(b);
    }
    return kids;
  };
  Ball.prototype.draw = function (ctx, frozen, t) {
    var r = this.r;
    var img = this.kind === 'gem' ? SP.gfx.gemImg(this.color, r) : SP.gfx.ballImg(this.color, r);
    var sx = 1, sy = 1;
    if (this.squash > 0) {
      var q = this.squash / 0.12;
      sx = 1 + 0.16 * q; sy = 1 - 0.16 * q;
    }
    var sp = this.spawn < 1 ? SP.ease.outBack(this.spawn) : 1;
    var w = img.lw * sx * sp, h = img.lh * sy * sp;
    // sombra en el piso
    var hgt = (PF.b - this.y - r) / 300;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.28 * (1 - SP.clamp(hgt, 0, 0.9))) + ')';
    ctx.beginPath();
    ctx.ellipse(this.x, PF.b - 2, r * (1 - SP.clamp(hgt, 0, 0.7) * 0.5), 3 + r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.kind === 'gem') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      var yy = this.y + (img.lh - h) / 2 * (sy < 1 ? 1 : 0);
      ctx.drawImage(img, this.x - w / 2, yy - h / 2, w, h);
    }
    if (frozen) {
      ctx.strokeStyle = 'rgba(200,240,255,' + (0.5 + 0.3 * Math.sin(t * 10)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
  E.Ball = Ball;

  // =======================================================
  // Bloques
  // =======================================================
  function Block(x, y, w, h, type, item) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.type = type === 'g' ? 'glass' : 'solid';
    this.item = item || null;
    this.dead = false;
    this.flash = 0;
  }
  Block.prototype.draw = function (ctx, t) {
    var x = this.x, y = this.y, w = this.w, h = this.h;
    if (this.type === 'solid') {
      ctx.fillStyle = G.theme.line;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#141428';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x + 3, y + 3, w - 6, 2);
      // remaches
      ctx.fillStyle = '#3a3f5a';
      var step = Math.max(14, Math.min(28, w / 3));
      if (w >= h) {
        for (var rx = x + 7; rx < x + w - 4; rx += step) {
          ctx.beginPath(); ctx.arc(rx, y + h / 2 + 1, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        for (var ry = y + 8; ry < y + h - 4; ry += 16) {
          ctx.beginPath(); ctx.arc(x + w / 2, ry, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = 'rgba(90,190,240,0.6)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#0a2448';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h - 4);
      ctx.lineTo(x + Math.min(14, w * 0.3), y + 4);
      ctx.moveTo(x + Math.min(12, w * 0.25), y + h - 4);
      ctx.lineTo(x + Math.min(20, w * 0.45), y + 4);
      ctx.stroke();
      var sh = (t * 0.6 + x * 0.01) % 2;
      if (sh < 1) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * Math.sin(sh * Math.PI)) + ')';
        var sx = x + sh * w;
        ctx.fillRect(Math.max(x + 2, sx - 4), y + 2, Math.min(8, x + w - 2 - sx + 4), h - 4);
      }
      if (this.item) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(SP.gfx.itemImg(this.item), x + w / 2 - 7, y + h / 2 - 7, 14, 14);
        ctx.globalAlpha = 1;
      }
    }
  };
  E.Block = Block;

  // =======================================================
  // Onda sónica (como el arpón de los clásicos, anclada al piso)
  // =======================================================
  function Wire(x, sticky) {
    this.x = x;
    this.y0 = PF.b;
    this.tip = PF.b - 50;
    this.sticky = !!sticky;
    this.stuck = 0;
    this.dead = false;
    this.t = 0;
  }
  Wire.prototype.update = function (dt, game) {
    this.t += dt;
    if (this.stuck > 0) {
      this.stuck -= dt;
      if (this.stuck <= 0) this.dead = true;
      return;
    }
    var prev = this.tip;
    this.tip -= E.WIRE_SPEED * dt;
    var hitB = null, best = -1;
    for (var i = 0; i < game.blocks.length; i++) {
      var b = game.blocks[i];
      if (b.dead) continue;
      var bot = b.y + b.h;
      if (this.x >= b.x - 1 && this.x <= b.x + b.w + 1 && this.tip <= bot && prev >= b.y && bot > best) {
        best = bot; hitB = b;
      }
    }
    if (hitB) {
      if (hitB.type === 'glass') {
        game.breakBlock(hitB);
        this.dead = true;
        return;
      }
      this.tip = hitB.y + hitB.h;
      if (this.sticky) { this.stuck = 2.6; game.sfx('stick'); }
      else { this.dead = true; game.sfx('block'); game.spark(this.x, this.tip, '#bfefff', 4); }
      return;
    }
    if (this.tip <= PF.t) {
      this.tip = PF.t;
      if (this.sticky) { this.stuck = 2.6; game.sfx('stick'); }
      else this.dead = true;
    }
  };
  Wire.prototype.hits = function (ball) {
    var cy = SP.clamp(ball.y, this.tip, this.y0);
    var dx = ball.x - this.x, dy = ball.y - cy;
    return dx * dx + dy * dy < (ball.r + 2) * (ball.r + 2);
  };
  Wire.prototype.draw = function (ctx) {
    var col = this.sticky ? '#ffd23f' : '#5ff3ff';
    var core = this.sticky ? '#fff7c8' : '#ffffff';
    var amp = 3.2, wl = 15, ph = this.t * 26;
    var top = this.tip, bot = this.y0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var path = function () {
      ctx.beginPath();
      for (var y = bot; y >= top; y -= 3) {
        var k = Math.min(1, (bot - y) / 30);
        var xx = this.x + Math.sin(y / wl * Math.PI * 2 + ph) * amp * k;
        if (y === bot) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
      }
      ctx.lineTo(this.x, top);
    }.bind(this);
    path();
    ctx.strokeStyle = SP.alpha(col, 0.28);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // punta: anillos de sonido
    if (this.stuck > 0) {
      ctx.fillStyle = col;
      ctx.strokeStyle = '#3a2a00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x - 9, top); ctx.lineTo(this.x + 9, top); ctx.lineTo(this.x + 5, top + 6); ctx.lineTo(this.x - 5, top + 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (this.stuck < 0.8 && Math.floor(this.stuck * 12) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }
    } else {
      for (var i = 0; i < 3; i++) {
        var rr = 5 + i * 4 + ((this.t * 40) % 4);
        ctx.strokeStyle = SP.alpha(col, 0.9 - i * 0.25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, top + 6 + i * 2, rr, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  E.Wire = Wire;

  // Disparo de ráfaga
  function Bullet(x, y) {
    this.x = x; this.y = y; this.vy = -740; this.r = 5; this.dead = false; this.t = 0;
  }
  Bullet.prototype.update = function (dt, game) {
    this.t += dt;
    this.y += this.vy * dt;
    if (this.y < PF.t) { this.dead = true; return; }
    for (var i = 0; i < game.blocks.length; i++) {
      var b = game.blocks[i];
      if (b.dead) continue;
      if (this.x >= b.x && this.x <= b.x + b.w && this.y >= b.y && this.y <= b.y + b.h) {
        this.dead = true;
        if (b.type === 'glass') game.breakBlock(b);
        else game.spark(this.x, b.y + b.h, '#ffc8a8', 3);
        return;
      }
    }
  };
  Bullet.prototype.hits = function (ball) {
    var dx = ball.x - this.x, dy = ball.y - this.y, rr = ball.r + this.r;
    return dx * dx + dy * dy < rr * rr;
  };
  Bullet.prototype.draw = function (ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,90,90,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(this.x, this.y + 7, 7, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.strokeStyle = '#ffd0c0';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(this.x, this.y + 7, 7, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(this.x, this.y + 12, 7, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
    ctx.restore();
  };
  E.Bullet = Bullet;

  // =======================================================
  // Ítems
  // =======================================================
  function Item(type, x, y) {
    this.type = type;
    this.x = SP.clamp(x, PF.l + 14, PF.r - 14);
    this.y = y;
    this.vy = -140;
    this.life = 7.5;
    this.landed = false;
    this.t = 0;
    this.dead = false;
  }
  Item.prototype.update = function (dt, game) {
    this.t += dt;
    if (!this.landed) {
      var prevBottom = this.y + 13;
      this.vy = Math.min(this.vy + 620 * dt, 420);
      this.y += this.vy * dt;
      var bottom = this.y + 13;
      if (bottom >= PF.b) { this.y = PF.b - 13; this.landed = true; game.sfx('land'); return; }
      if (this.vy > 0) {
        for (var i = 0; i < game.blocks.length; i++) {
          var b = game.blocks[i];
          if (b.dead) continue;
          if (this.x > b.x && this.x < b.x + b.w && prevBottom <= b.y + 1 && bottom >= b.y) {
            this.y = b.y - 13;
            this.landed = true;
            this.onBlock = b;
            game.sfx('land');
            return;
          }
        }
      }
    } else {
      if (this.onBlock && this.onBlock.dead) { this.landed = false; this.onBlock = null; this.vy = 0; }
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    }
  };
  Item.prototype.draw = function (ctx) {
    if (this.landed && this.life < 2 && Math.floor(this.life * 10) % 2 === 0) return;
    var bob = this.landed ? Math.sin(this.t * 5) * 1.5 : 0;
    var img = SP.gfx.itemImg(this.type);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 13, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, this.x - 14, this.y - 14 + bob - 1, 28, 28);
  };
  E.Item = Item;

  // =======================================================
  // Jugador: SONIC
  // =======================================================
  function Player() {
    this.x = 320;
    this.y = PF.b;
    this.facing = 1;
    this.moving = false;
    this.walkT = 0;
    this.shootT = 0;
    this.weapon = 'single';
    this.shield = false;
    this.invuln = 0;
    this.dead = false;
    this.win = false;
    this.blinkT = 2.5;
    this.rot = 0;
  }
  Player.prototype.update = function (dt, ctrl) {
    if (this.dead) {
      this.dvy += 1150 * dt;
      this.x += this.dvx * dt;
      this.y += this.dvy * dt;
      this.rot += dt * 12 * (this.dvx < 0 ? -1 : 1);
      if (this.x < PF.l + 10 || this.x > PF.r - 10) this.dvx = -this.dvx * 0.7;
      if (!this.bounced && this.y >= PF.b) {
        this.y = PF.b;
        this.dvy = -330;
        this.bounced = true;
      }
      return;
    }
    if (this.shootT > 0) this.shootT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 1.5 + Math.random() * 3;
    if (this.win) return;
    var dir = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    this.moving = dir !== 0;
    if (dir) this.facing = dir;
    this.x = SP.clamp(this.x + dir * E.PLAYER_SPEED * dt, PF.l + 12, PF.r - 12);
    if (this.moving) this.walkT += dt; else this.walkT = 0;
  };
  Player.prototype.die = function (fromX) {
    this.dead = true;
    this.dvx = (this.x < fromX ? -1 : 1) * 150;
    this.dvy = -480;
    this.bounced = false;
    this.rot = 0;
  };
  Player.prototype.touches = function (ball) {
    var rx = this.x - 9, ry = this.y - 42, rw = 18, rh = 42;
    var cx = SP.clamp(ball.x, rx, rx + rw), cy = SP.clamp(ball.y, ry, ry + rh);
    var dx = ball.x - cx, dy = ball.y - cy;
    var rr = ball.r - 1.5;
    return dx * dx + dy * dy < rr * rr;
  };
  Player.prototype.frame = function () {
    if (this.dead) return 'hurt';
    if (this.win) return 'win';
    if (this.shootT > 0) return 'shoot';
    if (this.moving) return 'walk' + (Math.floor(this.walkT * 11) % 4);
    var beat = SP.audio.beat();
    var f = (beat % 1) < 0.5 ? 'idle0' : 'idle1';
    if (f === 'idle0' && this.blinkT < 0) f = 'blink';
    return f;
  };
  Player.prototype.draw = function (ctx, t) {
    var name = this.frame();
    var img = SP.sprites.get(name);
    var flip = this.facing < 0 && !this.dead;
    if (!this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(this.x, PF.b - 1, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    var alpha = (this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0) ? 0.35 : 1;
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x, this.y - 30);
      ctx.rotate(this.rot);
      SP.gfx.drawPixel(ctx, img, -24, -32, 2, false);
      ctx.restore();
    } else {
      SP.gfx.drawPixel(ctx, img, Math.round(this.x - 24), Math.round(this.y - 62), 2, flip, alpha);
    }
    if (this.shield && !this.dead) {
      var pr = 34 + Math.sin(t * 6) * 1.5;
      var g = ctx.createRadialGradient(this.x - 8, this.y - 40, 4, this.x, this.y - 28, pr);
      g.addColorStop(0, 'rgba(255,255,255,0.35)');
      g.addColorStop(0.7, 'rgba(120,220,255,0.12)');
      g.addColorStop(1, 'rgba(80,190,255,0.45)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.x, this.y - 28, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,240,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  E.Player = Player;

  // =======================================================
  // JEFE 1: la Bola Disco
  // =======================================================
  function Disco(x, y) {
    this.type = 'disco';
    this.name = 'BOLA DISCO';
    this.x = x; this.y = y; this.r = 52;
    this.vx = 112; this.vy = 0;
    this.hp = this.maxhp = 26;
    this.flash = 0; this.rot = 0; this.t = 0; this.hits = 0;
    this.squash = 0;
    this.dead = false;
  }
  Disco.prototype.update = function (dt, game) {
    this.t += dt;
    this.rot += dt * 0.9;
    if (this.flash > 0) this.flash -= dt;
    if (this.squash > 0) this.squash -= dt;
    if (this.dying) return;
    var gs = game.gravScale;
    var angry = this.hp <= this.maxhp / 2;
    var vxs = angry ? 1.2 : 1;
    this.vy += E.GRAV * gs * dt;
    this.x += this.vx * vxs * dt;
    this.y += this.vy * dt;
    var r = this.r;
    if (this.x - r < PF.l) { this.x = PF.l + r; this.vx = Math.abs(this.vx); }
    if (this.x + r > PF.r) { this.x = PF.r - r; this.vx = -Math.abs(this.vx); }
    if (this.y + r > PF.b) {
      this.y = PF.b - r;
      this.vy = -Math.sqrt(2 * E.GRAV * gs * (angry ? 268 : 250));
      this.squash = 0.14;
      game.shake(angry ? 4 : 3);
      game.sfx('land');
    }
    if (this.y - r < PF.t) { this.y = PF.t + r; this.vy = Math.abs(this.vy); }
  };
  Disco.prototype.hitCircle = function () { return { x: this.x, y: this.y, r: this.r }; };
  Disco.prototype.hit = function (game, dmg) {
    if (this.dying) return;
    this.hp -= dmg;
    this.flash = 0.12;
    this.hits += dmg;
    game.sfx('bosshit');
    game.spark(this.x + SP.rand(-20, 20), this.y + SP.rand(-20, 20), '#ffffff', 6);
    if (this.hits >= 5 && this.hp > 0) {
      this.hits -= 5;
      var cols = SP.WORLDS[4].balls;
      for (var k = -1; k <= 1; k += 2) {
        var b = new E.Ball(2, this.x + k * 30, this.y, k, SP.pick(cols));
        b.vy = -330;
        game.addBall(b);
      }
      game.sfx('blow');
    }
    if (this.hp <= 0) game.bossDefeated(this);
  };
  Disco.prototype.draw = function (ctx, t) {
    var r = this.r;
    var sx = 1, sy = 1;
    if (this.squash > 0) { var q = this.squash / 0.14; sx = 1 + 0.12 * q; sy = 1 - 0.12 * q; }
    // haces de luz detrás
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cols = ['#ff4fb0', '#18d0d0', '#ffc81e', '#a03ae6', '#2fe07a'];
    for (var i = 0; i < 5; i++) {
      var a = this.rot * 1.5 + i * (Math.PI * 2 / 5);
      ctx.fillStyle = SP.alpha(cols[i], 0.13);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(a - 0.08) * 700, this.y + Math.sin(a - 0.08) * 700);
      ctx.lineTo(this.x + Math.cos(a + 0.08) * 700, this.y + Math.sin(a + 0.08) * 700);
      ctx.fill();
    }
    ctx.restore();
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(this.x, PF.b - 2, r * 0.9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(this.x, this.y + r * (1 - sy));
    ctx.scale(sx, sy);
    // esfera de espejos
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 4, 0, 0, r * 1.1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#b8bed4'); g.addColorStop(1, '#3a3e58');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    var n = 10;
    for (var row = -n; row <= n; row++) {
      var la = (row / n) * (Math.PI / 2);
      var yy = Math.sin(la) * r, rw = Math.cos(la) * r;
      var cells = Math.max(4, Math.round(16 * Math.cos(la)));
      for (var c = 0; c < cells; c++) {
        var lo = (c / cells) * Math.PI * 2 + this.rot;
        var cosLo = Math.cos(lo);
        if (cosLo < -0.05) continue;
        var xx = Math.sin(lo) * rw;
        var bright = 0.45 + 0.55 * Math.abs(Math.sin(lo * 3 + row + t * 3));
        var hue = (((c * 37 + row * 53 + Math.floor(t * 6)) % 7) + 7) % 7;
        var tint = ['#ffffff', '#e8f4ff', '#ffe8f8', '#fffbe0', '#e0fff8', '#d0d4e8', '#ffffff'][hue];
        ctx.fillStyle = SP.alpha(tint, 0.25 + bright * 0.55);
        var cw = Math.max(1.5, (r * 2 * Math.PI / cells / 2) * cosLo * 0.82);
        ctx.fillRect(xx - cw / 2, yy - r / n * 0.42, cw, r / n * 0.84);
      }
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0c0c1c';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    // cara enojada
    var angry = this.hp <= this.maxhp / 2;
    ctx.fillStyle = '#0c0c1c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-26, -20 + (angry ? 0 : 4)); ctx.lineTo(-8, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, -20 + (angry ? 0 : 4)); ctx.lineTo(8, -10); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-16, -2, 8, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(16, -2, 8, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = angry ? '#ff2a4a' : '#0c0c1c';
    ctx.beginPath(); ctx.arc(-14, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0c0c1c';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (angry) { ctx.moveTo(-16, 24); ctx.quadraticCurveTo(0, 14, 16, 24); }
    else { ctx.moveTo(-14, 18); ctx.quadraticCurveTo(0, 26, 14, 18); }
    ctx.stroke();
    // brillo
    G_spark(ctx, -r * 0.45, -r * 0.5, 9 + Math.sin(t * 8) * 3);
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  function G_spark(ctx, x, y, r) { SP.gfx.sparkle(ctx, x, y, r, '#ffffff', 0.95); }
  E.Disco = Disco;

  // =======================================================
  // JEFE FINAL: El Gran Mimo
  // =======================================================
  function Mimo() {
    this.type = 'mimo';
    this.name = 'EL GRAN MIMO';
    this.x = 320; this.y = 112; this.r = 46;
    this.hp = this.maxhp = 40;
    this.t = 0; this.flash = 0;
    this.blowT = 2.2;
    this.slamT = 3.5;
    this.slam = null;
    this.mouth = 'smirk';
    this.mouthT = 0;
    this.dead = false;
  }
  Mimo.prototype.phase2 = function () { return this.hp <= this.maxhp / 2; };
  Mimo.prototype.update = function (dt, game) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.mouthT > 0) { this.mouthT -= dt; if (this.mouthT <= 0) this.mouth = 'smirk'; }
    if (this.dying) return;
    var p2 = this.phase2();
    var spd = p2 ? 0.95 : 0.62;
    this.tt = (this.tt || 0) + dt * spd;
    this.x = 320 + Math.sin(this.tt) * 226;
    this.y = 112 + Math.sin(this.tt * 2.3) * 20;
    // soplar burbujas
    this.blowT -= dt;
    if (this.blowT < 0.55 && this.mouth !== 'blow') { this.mouth = 'blow'; this.mouthT = 0.7; }
    if (this.blowT <= 0) {
      this.blowT = p2 ? 2.8 : 3.6;
      var mass = game.ballMass();
      var cap = p2 ? 18 : 13;
      if (mass < cap) {
        var dir = game.player.x > this.x ? 1 : -1;
        var cols = SP.WORLDS[5].balls;
        var b;
        if (p2 && Math.random() < 0.45) b = new E.Ball(1, this.x, this.y + 52, dir, SP.pick(cols), 'g');
        else b = new E.Ball(p2 && Math.random() < 0.3 ? 0 : 1, this.x, this.y + 58, dir, SP.pick(cols));
        b.spawn = 0;
        b.vy = 40;
        game.addBall(b);
        game.sfx('blow');
      }
    }
    // manotazo (fase 2)
    if (p2) {
      if (!this.slam) {
        this.slamT -= dt;
        if (this.slamT <= 0) {
          this.slam = { x: SP.clamp(game.player.x, PF.l + 30, PF.r - 30), y: -60, st: 'warn', t: 0 };
          this.slamT = 4.8;
          game.sfx('warn');
        }
      } else {
        var s = this.slam;
        s.t += dt;
        if (s.st === 'warn') {
          if (s.t > 0.95) { s.st = 'drop'; s.t = 0; game.sfx('whoosh'); }
        } else if (s.st === 'drop') {
          s.y += 1150 * dt;
          if (s.y >= PF.b - 22) { s.y = PF.b - 22; s.st = 'hold'; s.t = 0; game.shake(8); game.sfx('slam'); game.dust(s.x, PF.b); }
        } else if (s.st === 'hold') {
          if (s.t > 0.4) { s.st = 'rise'; s.t = 0; }
        } else if (s.st === 'rise') {
          s.y -= 600 * dt;
          if (s.y < -70) this.slam = null;
        }
      }
    }
  };
  Mimo.prototype.hitCircle = function () { return { x: this.x, y: this.y, r: this.r }; };
  Mimo.prototype.slamHits = function (player) {
    var s = this.slam;
    if (!s || s.st === 'warn') return false;
    var rx = s.x - 26, ry = s.y - 30, rw = 52, rh = 52;
    var px0 = player.x - 9, py0 = player.y - 42;
    return px0 < rx + rw && px0 + 18 > rx && py0 < ry + rh && py0 + 42 > ry;
  };
  Mimo.prototype.hit = function (game, dmg) {
    if (this.dying) return;
    var wasP2 = this.phase2();
    this.hp -= dmg;
    this.flash = 0.12;
    this.mouth = 'ouch';
    this.mouthT = 0.35;
    game.sfx('bosshit');
    game.spark(this.x + SP.rand(-25, 25), this.y + SP.rand(-25, 25), '#ffffff', 6);
    if (!wasP2 && this.phase2() && this.hp > 0) {
      game.banner('¡EL MIMO SE ENOJÓ!', '#ff4f6a');
      game.shake(6);
    }
    if (this.hp <= 0) game.bossDefeated(this);
  };
  function glove(ctx, x, y, s, rot, flat) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#141428';
    ctx.lineWidth = 2.5 / s;
    ctx.beginPath();
    if (flat) {
      // palma abierta (pared invisible)
      G_round(ctx, -12, -16, 24, 30, 9);
      ctx.fill(); ctx.stroke();
      for (var f = 0; f < 4; f++) {
        G_round(ctx, -11 + f * 6, -27, 5.5, 14, 2.7);
        ctx.fill(); ctx.stroke();
      }
      G_round(ctx, 10, -8, 12, 6, 3);
      ctx.fill(); ctx.stroke();
    } else {
      // puño
      G_round(ctx, -16, -14, 32, 28, 11);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for (var k = 0; k < 3; k++) { ctx.moveTo(-6 + k * 8, -14); ctx.lineTo(-6 + k * 8, -2); }
      ctx.stroke();
    }
    ctx.fillStyle = '#e8e8f4';
    G_round(ctx, -12, 13, 24, 7, 3);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function G_round(ctx, x, y, w, h, r) { SP.gfx.roundRect(ctx, x, y, w, h, r); }
  Mimo.prototype.draw = function (ctx, t) {
    var x = this.x, y = this.y;
    var p2 = this.phase2();
    // manotazo: sombra de aviso y mano
    if (this.slam) {
      var s = this.slam;
      if (s.st === 'warn') {
        var a = 0.35 + 0.35 * Math.sin(s.t * 30);
        ctx.fillStyle = 'rgba(255,40,60,' + a + ')';
        ctx.beginPath(); ctx.ellipse(s.x, PF.b - 3, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
        SP.gfx.text(ctx, '!', s.x, PF.b - 40, { size: 30, font: SP.FONT.pixel, color: '#ff3050', stroke: '#200', strokeW: 5 });
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(s.x, PF.b - 3, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
        glove(ctx, s.x, s.y, 1.7, Math.PI, false);
      }
    }
    // manos flotando (mimo haciendo "la pared")
    var hb = Math.sin(t * 3) * 4;
    glove(ctx, x - 78, y + 18 + hb, 1.15, -0.25, true);
    glove(ctx, x + 78, y + 18 - hb, 1.15, 0.25, true);
    ctx.save();
    ctx.translate(x, y);
    // cuello de rayas
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 48, 40, 14, 0, 0, Math.PI * 2);
    ctx.clip();
    for (var i = -5; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#141428' : '#ffffff';
      ctx.fillRect(-44, 36 + (i + 5) * 3, 88, 3);
    }
    ctx.restore();
    ctx.strokeStyle = '#141428';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 48, 40, 14, 0, 0, Math.PI * 2); ctx.stroke();
    // cara
    var g = ctx.createRadialGradient(-14, -18, 6, 0, 0, 60);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#eef0f8'); g.addColorStop(1, '#c4c8dc');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 44, 50, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3.5; ctx.stroke();
    // boina
    ctx.fillStyle = p2 ? '#b0102a' : '#141428';
    ctx.beginPath(); ctx.ellipse(6, -44, 44, 15, -0.18, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -58); ctx.lineTo(13, -66); ctx.lineWidth = 4; ctx.stroke();
    // cejas
    ctx.strokeStyle = '#141428';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    var browY = p2 ? -14 : -22;
    ctx.beginPath(); ctx.moveTo(-28, browY - (p2 ? -6 : 4)); ctx.quadraticCurveTo(-18, browY - 8, -8, browY + (p2 ? 6 : 0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, browY - (p2 ? -6 : 4)); ctx.quadraticCurveTo(18, browY - 8, 8, browY + (p2 ? 6 : 0)); ctx.stroke();
    // ojos
    var ouch = this.mouth === 'ouch';
    if (ouch) {
      ctx.lineWidth = 3.5;
      [-18, 18].forEach(function (ex) {
        ctx.beginPath(); ctx.moveTo(ex - 6, -10); ctx.lineTo(ex + 6, 2); ctx.moveTo(ex + 6, -10); ctx.lineTo(ex - 6, 2); ctx.stroke();
      });
    } else {
      ctx.fillStyle = '#141428';
      var lookX = 0;
      if (this.lookX !== undefined) lookX = this.lookX;
      ctx.beginPath(); ctx.ellipse(-18 + lookX, -4, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(18 + lookX, -4, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-19 + lookX, -7, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(17 + lookX, -7, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // lágrima pintada
    ctx.fillStyle = '#141428';
    ctx.beginPath(); ctx.moveTo(18, 8); ctx.quadraticCurveTo(22, 16, 18, 19); ctx.quadraticCurveTo(14, 16, 18, 8); ctx.fill();
    // mejillas
    ctx.fillStyle = p2 ? 'rgba(255,60,80,0.55)' : 'rgba(255,120,150,0.35)';
    ctx.beginPath(); ctx.ellipse(-28, 14, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28, 14, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    // boca
    ctx.fillStyle = '#e0182e';
    ctx.strokeStyle = '#141428';
    ctx.lineWidth = 2.5;
    if (this.mouth === 'blow') {
      ctx.beginPath(); ctx.ellipse(0, 28, 7, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a0010';
      ctx.beginPath(); ctx.ellipse(0, 28, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (ouch) {
      ctx.beginPath(); ctx.moveTo(-14, 30);
      for (var w = 0; w < 6; w++) ctx.lineTo(-14 + (w + 1) * 4.7, 30 + (w % 2 ? -4 : 4));
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-15, 26);
      ctx.quadraticCurveTo(0, p2 ? 22 : 36, 15, 24);
      ctx.quadraticCurveTo(0, p2 ? 30 : 30, -15, 26);
      ctx.fill(); ctx.stroke();
    }
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,80,100,0.45)';
      ctx.beginPath(); ctx.ellipse(0, 0, 44, 50, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  E.Mimo = Mimo;
})();
