/* Kit de pruebas para la consola del navegador (no se carga en el juego).
   Uso: const s=document.createElement('script'); s.src='tools/testkit.js'; document.head.appendChild(s);
   Avanza escenas sin depender del refresco de pantalla. */
(function () {
  var SP = window.SP;
  window.adv = function (sec) {
    var n = Math.round(sec * 120);
    for (var i = 0; i < n; i++) { SP.scenes[SP.sceneName].update(1 / 120); SP.input.endStep(); }
    return SP.sceneName;
  };
  window.tap = function (code) {
    SP.input.simPress(code);
    SP.scenes[SP.sceneName].update(1 / 120);
    SP.input.endStep();
    SP.input.simRelease(code);
    return SP.sceneName;
  };
  window.draw = function () {
    var c = document.getElementById('game'), ctx = c.getContext('2d');
    ctx.setTransform(c.width / 640, 0, 0, c.width / 640, 0, 0);
    SP.scenes[SP.sceneName].render(ctx);
    return SP.sceneName;
  };
  window.cost = function (n) {
    var c = document.getElementById('game'), ctx = c.getContext('2d'), s = SP.scenes[SP.sceneName];
    var t0 = performance.now();
    for (var i = 0; i < n; i++) { ctx.setTransform(c.width / 640, 0, 0, c.width / 640, 0, 0); s.render(ctx); }
    return ((performance.now() - t0) / n).toFixed(2) + ' ms';
  };
  window.botStep = function (g, memo) {
    var p = g.player, tx = null, best = null, bs = 1e9;
    g.balls.forEach(function (b) { var s = Math.abs(b.x - p.x) - b.y * 0.3; if (s < bs) { bs = s; best = b; } });
    if (g.boss && !g.boss.dying && g.ballMass() < 10) tx = g.boss.x; else if (best) tx = best.x;
    var c = { left: false, right: false, fire: false, firePressed: false, boomPressed: false };
    if (tx !== null) {
      if (tx < p.x - 4) c.left = true; else if (tx > p.x + 4) c.right = true;
      if (Math.abs(tx - p.x) < 10) { memo.cd -= 1 / 120; if (memo.cd <= 0) { c.firePressed = true; c.fire = true; memo.cd = 0.12; } }
    }
    return c;
  };
  window.runBot = function (sec) {
    var g = SP.debug.game(), memo = { cd: 0 }, n = Math.round(sec * 120);
    for (var i = 0; i < n; i++) { g.update(1 / 120, window.botStep(g, memo)); SP.input.endStep(); }
    return g.state;
  };
  window.TESTKIT = true;
})();
