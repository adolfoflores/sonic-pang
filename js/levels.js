/* =========================================================
   SONIC PANG — niveles (6 mundos x 5 niveles)
   b: bolas [tamaño, x, y, dirección, color?, 'g' = gema]
      tamaños: 0 = gigante, 1 = grande, 2 = mediana, 3 = chica
   k: bloques [x, y, ancho, alto, 's' sólido | 'g' cristal]
   items: ítem escondido en un bloque de cristal (por índice)
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;

  function row(n, x0, step, size, y, alt, colorIdx) {
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push([size, x0 + i * step, y + (alt ? (i % 2) * alt : 0), i % 2 ? -1 : 1, colorIdx !== undefined ? colorIdx : i]);
    }
    return out;
  }
  function glassRow(x0, x1, y, w, h) {
    var out = [];
    for (var x = x0; x + w <= x1; x += w + 4) out.push([x, y, w, h || 18, 'g']);
    return out;
  }

  SP.LEVELS = [
    // ---------------- MUNDO 1: BARRIO ----------------
    { t: 60, b: [[1, 170, 150, 1, 0]] },
    { t: 75, b: [[0, 150, 130, 1, 1]] },
    { t: 85, b: [[1, 120, 150, 1, 0], [1, 520, 150, -1, 2]] },
    { t: 100, b: [[0, 150, 120, 1, 3]], k: [[260, 196, 120, 16, 's']] },
    {
      t: 110, b: [[0, 160, 120, 1, 0], [1, 500, 150, -1, 1]],
      k: [[86, 230, 96, 18, 'g'], [458, 230, 96, 18, 'g']],
      items: { 0: 'double', 1: 'shield' }
    },

    // ---------------- MUNDO 2: PLAYA ----------------
    { t: 90, b: [[1, 110, 150, 1, 0], [2, 300, 190, -1, 1], [2, 340, 190, 1, 2], [1, 530, 150, -1, 3]] },
    { t: 110, b: [[0, 320, 120, 1, 1]], k: [[150, 210, 22, 110, 's'], [468, 210, 22, 110, 's']] },
    { t: 95, b: row(6, 70, 100, 2, 160, 30) },
    { t: 120, b: [[0, 110, 120, 1, 0], [0, 530, 120, -1, 2]] },
    {
      t: 125, b: [[0, 320, 110, -1, 3], [1, 120, 160, 1, 0], [1, 520, 160, -1, 1]],
      k: [[60, 262, 100, 16, 's'], [480, 262, 100, 16, 's'], [270, 186, 100, 18, 'g']],
      items: { 2: 'sticky' }
    },

    // ---------------- MUNDO 3: CIUDAD ----------------
    { t: 90, b: [[1, 320, 170, 1, 1, 'g']] },
    {
      t: 115, b: [[0, 320, 170, 1, 0]],
      k: glassRow(30, 612, 66, 66, 18),
      items: { 1: 'vulcan', 4: 'cd', 6: 'clock' }
    },
    { t: 125, b: [[0, 140, 130, 1, 2], [1, 470, 150, -1, 3], [1, 570, 150, -1, 0]], k: [[300, 170, 40, 140, 's']] },
    { t: 125, b: [[1, 120, 170, 1, 1, 'g'], [1, 520, 170, -1, 2, 'g'], [0, 320, 120, 1, 0]] },
    {
      t: 135,
      b: [[1, 320, 160, 1, 3], [2, 80, 190, 1, 0], [2, 560, 190, -1, 1]],
      k: [[250, 86, 140, 18, 'g'], [250, 104, 18, 122, 'g'], [372, 104, 18, 122, 'g'], [268, 226, 104, 18, 'g']],
      items: { 0: 'shield', 3: 'dynamite' }
    },

    // ---------------- MUNDO 4: DESIERTO ----------------
    { t: 120, b: row(4, 80, 160, 1, 150, 0) },
    { t: 135, b: [[0, 120, 120, 1, 0], [0, 520, 120, -1, 1]], k: [[196, 206, 84, 16, 's'], [360, 206, 84, 16, 's']] },
    { t: 115, b: [[2, 100, 160, 1, 0, 'g'], [2, 320, 130, -1, 1, 'g'], [2, 540, 160, 1, 2, 'g'], [1, 320, 170, 1, 3]] },
    {
      t: 130, b: [[0, 150, 262, 1, 2], [1, 480, 282, -1, 3]],
      k: [[12, 150, 206, 16, 's'], [218, 150, 206, 16, 's'], [424, 150, 204, 16, 's']]
    },
    {
      t: 145, b: [[0, 100, 120, 1, 0], [0, 540, 120, -1, 1], [1, 320, 150, 1, 2]],
      k: [[60, 246, 74, 18, 'g'], [283, 236, 74, 18, 'g'], [506, 246, 74, 18, 'g']],
      items: { 0: 'clock', 1: 'vulcan', 2: 'dynamite' }
    },

    // ---------------- MUNDO 5: ANTRO ----------------
    { t: 110, b: row(6, 70, 100, 2, 150, 40) },
    {
      t: 135, b: [[1, 120, 160, 1, 0, 'g'], [1, 520, 160, -1, 1, 'g'], [0, 320, 110, 1, 2]],
      k: [[196, 256, 64, 18, 'g'], [380, 256, 64, 18, 'g']],
      items: { 0: 'double', 1: 'battery' }
    },
    {
      t: 145, b: [[0, 320, 110, 1, 3], [1, 90, 150, 1, 0]],
      k: [[100, 204, 124, 16, 's'], [416, 204, 124, 16, 's'], [258, 284, 124, 16, 's'], [36, 306, 62, 18, 'g'], [542, 306, 62, 18, 'g']],
      items: { 3: 'sticky', 4: 'shield' }
    },
    { t: 155, b: [[0, 110, 120, 1, 0], [0, 320, 100, -1, 1], [0, 530, 120, -1, 2]] },
    { t: 210, boss: 'disco', b: [] },

    // ---------------- MUNDO 6: ESPACIO ----------------
    { t: 125, b: [[0, 160, 120, 1, 0], [0, 480, 120, -1, 1]] },
    { t: 130, b: [[1, 110, 150, 1, 0, 'g'], [2, 300, 190, -1, 1], [2, 340, 190, 1, 3], [1, 530, 150, -1, 2, 'g']] },
    {
      t: 145, b: [[0, 120, 120, 1, 3], [0, 520, 120, -1, 0], [1, 320, 170, 1, 1, 'g']],
      k: [[290, 236, 60, 16, 's']]
    },
    {
      t: 165, b: [[0, 100, 120, 1, 0], [0, 540, 120, -1, 1], [1, 250, 160, 1, 2, 'g'], [1, 390, 160, -1, 3, 'g']],
      k: [[150, 258, 80, 18, 'g'], [410, 258, 80, 18, 'g']],
      items: { 0: 'shield', 1: 'double' }
    },
    { t: 260, boss: 'mimo', b: [] }
  ];

  SP.LEVELS_PER_WORLD = 5;
  SP.levelWorld = function (i) { return Math.floor(i / SP.LEVELS_PER_WORLD); };
  SP.levelLabel = function (i) { return (SP.levelWorld(i) + 1) + '-' + ((i % SP.LEVELS_PER_WORLD) + 1); };

  // Tabla de ítems que sueltan las burbujas
  SP.DROPS = [
    ['double', 10], ['sticky', 8], ['vulcan', 7], ['shield', 7], ['clock', 5], ['hourglass', 5],
    ['dynamite', 3], ['battery', 6], ['cassette', 15], ['cd', 10], ['vinyl', 6], ['goldnote', 1.2], ['oneup', 0.9]
  ];
  SP.ITEM_INFO = {
    double: { name: 'DOBLE ONDA', desc: 'Dos ondas a la vez' },
    sticky: { name: 'ONDA FIJA', desc: 'La onda se pega al techo' },
    vulcan: { name: 'RÁFAGA', desc: 'Disparo continuo de anillos' },
    shield: { name: 'ESCUDO', desc: 'Aguanta un golpe' },
    clock: { name: 'RELOJ', desc: 'Congela las burbujas' },
    hourglass: { name: 'ARENA', desc: 'Burbujas en cámara lenta' },
    dynamite: { name: 'DINAMITA', desc: 'Todo se parte en chiquitas' },
    battery: { name: 'BATERÍA', desc: 'Carga media barra SONIC' },
    oneup: { name: '1UP', desc: 'Una vida extra' },
    cassette: { name: 'CASSETTE', desc: '500 puntos', pts: 500 },
    cd: { name: 'CD', desc: '1,000 puntos', pts: 1000 },
    vinyl: { name: 'VINIL', desc: '2,000 puntos', pts: 2000 },
    goldnote: { name: 'NOTA DORADA', desc: '5,000 puntos', pts: 5000 }
  };
})();
