/* =========================================================
   SONIC PANG — arranque, bucle principal, escalado y escenas
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var G = SP.gfx;
  var I = SP.input;
  var A = SP.audio;
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  SP.reduceMotion = motionPreference.matches;
  motionPreference.addEventListener('change', function (e) { SP.reduceMotion = e.matches; });

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  SP.canvas = canvas;

  SP.store.load();
  A.musicVol = SP.store.data.opts.music;
  A.sfxVol = SP.store.data.opts.sfx;

  // ---------- Táctil ----------
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  if (touchCapable && coarse) {
    document.body.classList.add('is-touch');
    I.touch = true;
  }
  I.attachCanvas(canvas);
  I.attachTouch(document.getElementById('touch'));

  // ---------- Escalado nítido ----------
  var view = { scale: 1 };
  function resize() {
    var footer = document.getElementById('footer');
    var fh = footer && getComputedStyle(footer).display !== 'none' ? 24 : 0;
    var margin = I.touch ? 0 : 16;
    var aw = window.innerWidth - margin;
    var ah = window.innerHeight - fh - margin;
    if (I.touch && window.innerHeight > window.innerWidth) ah = window.innerHeight * 0.6;
    var s = Math.min(aw / SP.W, ah / SP.H);
    s = Math.max(0.3, s);
    var cw = Math.floor(SP.W * s), ch = Math.floor(SP.H * s);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = SP.W;
    canvas.height = SP.H;
    view.scale = 1;
    G.setScale(1);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  resize();

  // ---------- Audio: se activa con el primer gesto ----------
  SP.onFirstGesture = function () { A.init(); };
  document.addEventListener('visibilitychange', function () {
    if (!A.ctx) return;
    try {
      if (document.hidden) A.ctx.suspend();
      else A.ctx.resume();
    } catch (e) { /* nada */ }
  });
  SP.onBlur = function () { SP.autoPause = true; };

  SP.setVolume = function (kind, v) {
    v = Math.round(SP.clamp(v, 0, 1) * 10) / 10;
    if (kind === 'music') { A.setMusicVol(v); SP.store.data.opts.music = v; }
    else { A.setSfxVol(v); SP.store.data.opts.sfx = v; }
    SP.store.save();
  };
  SP.toggleFullscreen = function () {
    var d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch (e) { /* nada */ }
    setTimeout(resize, 250);
  };

  var toast = { text: '', t: 0 };
  SP.toast = function (text) { toast.text = text; toast.t = 1.6; };
  var savedMusic = 0.7;
  window.addEventListener('keydown', function (e) {
    if (SP.sceneName === 'nameentry' || e.repeat || e.metaKey || e.ctrlKey) return;
    if (e.code === 'KeyM') {
      if (A.musicVol > 0) { savedMusic = A.musicVol; SP.setVolume('music', 0); SP.toast('MÚSICA: NO'); }
      else { SP.setVolume('music', savedMusic || 0.7); SP.toast('MÚSICA: SÍ'); }
    } else if (e.code === 'KeyF') {
      SP.toggleFullscreen();
    }
  });

  // ---------- Escenas y transiciones ----------
  var cur = null;
  var fade = { a: 0, dir: 0, next: null, action: null };
  function switchTo(name, params) {
    if (cur && cur.exit) cur.exit();
    cur = SP.scenes[name];
    SP.sceneName = name;
    document.body.dataset.scene = name;
    cur.enter(params);
  }
  SP.go = function (name, params, instant) {
    if (instant) { switchTo(name, params); fade.a = 0; fade.dir = 0; fade.next = null; return; }
    if (fade.next || fade.action) return;
    fade.next = { name: name, params: params };
    fade.dir = 1;
  };
  SP.fadeAction = function (fn) {
    if (fade.next || fade.action) return;
    fade.action = fn;
    fade.dir = 1;
  };
  function updateFade(dt) {
    if (fade.dir === 1) {
      fade.a += dt * 5;
      if (fade.a >= 1) {
        fade.a = 1;
        if (fade.next) { var n = fade.next; fade.next = null; switchTo(n.name, n.params); }
        if (fade.action) { var f = fade.action; fade.action = null; f(); }
        fade.dir = -1;
      }
    } else if (fade.dir === -1) {
      fade.a -= dt * 4;
      if (fade.a <= 0) { fade.a = 0; fade.dir = 0; }
    }
  }

  // ---------- Bucle ----------
  var STEP = 1 / 120;
  var last = performance.now(), acc = 0;
  var fps = { n: 0, t: 0, v: 0 };
  var showFps = /[?&]fps\b/.test(location.search);
  SP.paused = false;

  var errors = 0;
  function frame(now) {
    // el bucle nunca debe morir: cualquier error se registra y el juego sigue
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    try {
      I.pollGamepad();
      acc += dt;
      var steps = 0;
      while (acc >= STEP && steps < 12) {
        if (fade.dir !== 1 && cur && !SP.paused) cur.update(STEP);
        I.endStep();
        acc -= STEP;
        steps++;
      }
      if (steps >= 12) acc = 0;
      updateFade(dt);
      if (toast.t > 0) toast.t -= dt;
      render(dt);
    } catch (e) {
      errors++;
      if (errors < 20) console.error('[Sonic Pang]', e);
      I.endStep();
      try { ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (e2) { /* nada */ }
    }
    fps.n++; fps.t += dt;
    if (fps.t >= 0.5) { fps.v = Math.round(fps.n / fps.t); fps.n = 0; fps.t = 0; }
  }

  function render() {
    ctx.save();
    try { renderInner(); } finally { ctx.restore(); }
  }
  function renderInner() {
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    if (cur) cur.render(ctx);
    if (SP.store.data.opts.scanlines) G.scanlines(ctx);
    if (fade.a > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + fade.a + ')';
      ctx.fillRect(0, 0, SP.W, SP.H);
    }
    if (toast.t > 0) {
      var a = Math.min(1, toast.t * 3);
      G.panel(ctx, 460, 10, 170, 30);
      G.text(ctx, toast.text, 545, 26, { size: 9, font: SP.FONT.pixel, color: '#ffffff', alpha: a });
    }
    if (showFps) G.text(ctx, fps.v + ' FPS', 6, 8, { size: 7, font: SP.FONT.pixel, color: '#0f0', align: 'left' });
  }

  // ---------- Depuración (para pruebas) ----------
  SP.debug = {
    god: false,
    play: function (level) { SP.go('play', { mode: 'story', level: level || 0 }, true); },
    endless: function () { SP.go('play', { mode: 'endless' }, true); },
    scene: function () { return SP.sceneName; },
    game: function () { return SP.scenes.play && SP.scenes.play.game; },
    clear: function () {
      var g = this.game();
      if (!g) return;
      g.balls.length = 0;
      if (g.boss) g.boss.hp = 0.001;
    },
    go: function (name, params) { SP.go(name, params, true); }
  };

  SP.go('boot', null, true);
  requestAnimationFrame(frame);
})();
