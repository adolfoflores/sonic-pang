/* =========================================================
   SONIC PANG — entrada: teclado, ratón, táctil y gamepad
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;

  var held = {};       // código -> true mientras está pulsado
  var hits = {};       // código -> true si se pulsó desde el último paso
  var typed = [];      // caracteres escritos (para el nombre de récords)
  var gpPrev = {};

  var MAP = {
    left:  ['ArrowLeft', 'KeyA', 'GP_LEFT', 'T_LEFT'],
    right: ['ArrowRight', 'KeyD', 'GP_RIGHT', 'T_RIGHT'],
    up:    ['ArrowUp', 'KeyW', 'GP_UP'],
    down:  ['ArrowDown', 'KeyS', 'GP_DOWN'],
    fire:  ['Space', 'KeyZ', 'KeyK', 'KeyJ', 'ArrowUp', 'KeyW', 'GP_A', 'GP_X', 'T_FIRE'],
    boom:  ['KeyX', 'KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight', 'GP_B', 'GP_Y', 'GP_RB', 'T_BOOM'],
    pause: ['KeyP', 'Escape', 'Enter', 'GP_START', 'T_PAUSE'],
    ok:    ['Enter', 'Space', 'KeyZ', 'GP_A', 'GP_START', 'T_FIRE'],
    back:  ['Escape', 'Backspace', 'GP_B', 'T_PAUSE'],
    select: ['GP_A', 'T_FIRE'],
    confirm: ['Enter', 'GP_START'],
    esc:   ['Escape', 'GP_B', 'T_PAUSE'],
    any:   null
  };
  var BLOCK = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, Tab: 1, Backspace: 1 };

  var I = SP.input = {
    mouse: { x: -1, y: -1, down: false, clicked: false, moved: false, active: false },
    lastDevice: 'keyboard',
    touch: false,
    anyHit: false,
    typed: typed
  };

  I.down = function (action) {
    var keys = MAP[action];
    for (var i = 0; i < keys.length; i++) if (held[keys[i]]) return true;
    return false;
  };
  I.hit = function (action) {
    if (action === 'any') return I.anyHit;
    var keys = MAP[action];
    for (var i = 0; i < keys.length; i++) if (hits[keys[i]]) return true;
    return false;
  };
  I.consume = function (action) {
    var keys = MAP[action];
    for (var i = 0; i < keys.length; i++) hits[keys[i]] = false;
  };
  // Se llama al final de cada paso de lógica
  I.endStep = function () {
    for (var k in hits) hits[k] = false;
    I.anyHit = false;
    I.mouse.clicked = false;
    I.mouse.moved = false;
    typed.length = 0;
  };
  I.clearAll = function () {
    for (var k in held) held[k] = false;
    I.endStep();
  };

  function press(code) {
    if (!held[code]) hits[code] = true;
    held[code] = true;
    I.anyHit = true;
  }
  function release(code) { held[code] = false; }

  // ---------- Teclado ----------
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey) return;
    if (BLOCK[e.code]) e.preventDefault();
    I.lastDevice = 'keyboard';
    if (!e.repeat) press(e.code);
    if (e.key && e.key.length === 1) typed.push(e.key);
    else if (e.key === 'Backspace') typed.push('\b');
    else if (e.key === 'Enter') typed.push('\n');
    if (SP.onFirstGesture) SP.onFirstGesture();
  });
  window.addEventListener('keyup', function (e) { release(e.code); });
  window.addEventListener('blur', function () { I.clearAll(); if (SP.onBlur) SP.onBlur(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { I.clearAll(); if (SP.onBlur) SP.onBlur(); }
  });

  // ---------- Ratón / puntero sobre el canvas ----------
  I.attachCanvas = function (canvas) {
    function toLocal(e) {
      var r = canvas.getBoundingClientRect();
      I.mouse.x = ((e.clientX - r.left) / r.width) * SP.W;
      I.mouse.y = ((e.clientY - r.top) / r.height) * SP.H;
    }
    canvas.addEventListener('pointermove', function (e) {
      toLocal(e);
      I.mouse.moved = true;
      I.mouse.active = true;
      if (e.pointerType === 'mouse') I.lastDevice = 'mouse';
    });
    canvas.addEventListener('pointerdown', function (e) {
      toLocal(e);
      I.mouse.down = true;
      I.mouse.clicked = true;
      I.mouse.active = true;
      I.anyHit = true;
      I.lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
      canvas.focus();
      if (SP.onFirstGesture) SP.onFirstGesture();
    });
    window.addEventListener('pointerup', function () { I.mouse.down = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  // ---------- Botones táctiles ----------
  I.attachTouch = function (root) {
    var btns = root.querySelectorAll('[data-key]');
    Array.prototype.forEach.call(btns, function (b) {
      var code = b.getAttribute('data-key');
      var on = function (e) {
        e.preventDefault();
        I.lastDevice = 'touch';
        press(code);
        b.classList.add('on');
        if (SP.onFirstGesture) SP.onFirstGesture();
      };
      var off = function (e) {
        if (e) e.preventDefault();
        release(code);
        b.classList.remove('on');
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  };

  // ---------- Gamepad ----------
  I.pollGamepad = function () {
    if (!navigator.getGamepads) return;
    var pads = navigator.getGamepads();
    var gp = null;
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
    var now = {};
    if (gp) {
      var b = gp.buttons, ax = gp.axes;
      var bt = function (n) { return b[n] && (b[n].pressed || b[n].value > 0.5); };
      now.GP_A = bt(0);
      now.GP_B = bt(1);
      now.GP_X = bt(2);
      now.GP_Y = bt(3);
      now.GP_RB = bt(5) || bt(7);
      now.GP_START = bt(9);
      now.GP_UP = bt(12) || (ax[1] !== undefined && ax[1] < -0.5);
      now.GP_DOWN = bt(13) || (ax[1] !== undefined && ax[1] > 0.5);
      now.GP_LEFT = bt(14) || (ax[0] !== undefined && ax[0] < -0.4);
      now.GP_RIGHT = bt(15) || (ax[0] !== undefined && ax[0] > 0.4);
    }
    var names = ['GP_A', 'GP_B', 'GP_X', 'GP_Y', 'GP_RB', 'GP_START', 'GP_UP', 'GP_DOWN', 'GP_LEFT', 'GP_RIGHT'];
    for (var j = 0; j < names.length; j++) {
      var n = names[j];
      if (now[n] && !gpPrev[n]) { press(n); I.lastDevice = 'gamepad'; if (SP.onFirstGesture) SP.onFirstGesture(); }
      if (!now[n] && gpPrev[n]) release(n);
      gpPrev[n] = !!now[n];
    }
  };

  // Simulación (para pruebas automáticas)
  I.simPress = press;
  I.simRelease = release;
})();
