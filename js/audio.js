/* =========================================================
   SONIC PANG — audio: síntesis de efectos y secuenciador chiptune
   Todo se genera con WebAudio: no hay archivos de sonido.
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;

  var A = SP.audio = {
    ctx: null,
    ready: false,
    musicVol: 0.7,
    sfxVol: 0.85,
    current: null,      // id de la canción actual
    songRoot: 60,
    songScale: 'major'
  };

  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  A.midi = function (name) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return null;
    var n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 12 * (parseInt(m[3], 10) + 1) + n;
  };
  A.freq = function (midi) { return 440 * Math.pow(2, (midi - 69) / 12); };

  function makePulse(ctx, duty) {
    var n = 64, real = new Float32Array(n), imag = new Float32Array(n);
    for (var i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state !== 'running') { try { A.ctx.resume(); } catch (e) { /* nada */ } }
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    var ctx = A.ctx;

    A.out = ctx.createDynamicsCompressor();
    A.out.threshold.value = -16;
    A.out.knee.value = 12;
    A.out.ratio.value = 4;
    A.out.attack.value = 0.003;
    A.out.release.value = 0.18;
    A.out.connect(ctx.destination);

    A.master = ctx.createGain();
    A.master.gain.value = 0.95;
    A.master.connect(A.out);

    A.musicBus = ctx.createGain();
    A.sfxBus = ctx.createGain();
    A.analyser = ctx.createAnalyser();
    A.analyser.fftSize = 256;
    A.analyser.smoothingTimeConstant = 0.72;
    A.musicBus.connect(A.analyser);
    A.analyser.connect(A.master);
    A.sfxBus.connect(A.master);
    A.freqData = new Uint8Array(A.analyser.frequencyBinCount);

    // Eco para la melodía (muy de 2004)
    A.echo = ctx.createDelay(1.0);
    A.echo.delayTime.value = 0.3;
    A.echoFb = ctx.createGain();
    A.echoFb.gain.value = 0.28;
    A.echoWet = ctx.createGain();
    A.echoWet.gain.value = 0.22;
    A.echo.connect(A.echoFb);
    A.echoFb.connect(A.echo);
    A.echo.connect(A.echoWet);
    A.echoWet.connect(A.musicBus);

    // Ruido blanco compartido
    var len = ctx.sampleRate;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;

    A.waves = { p12: makePulse(ctx, 0.125), p25: makePulse(ctx, 0.25), p50: makePulse(ctx, 0.5) };
    A.ready = true;
    A.applyVolumes();
    if (A.pending) { var p = A.pending; A.pending = null; A.playSong(p.id, p.opts); }
  };

  A.applyVolumes = function () {
    if (!A.ready) return;
    var t = A.ctx.currentTime;
    A.musicBus.gain.setTargetAtTime(A.musicVol * 0.62, t, 0.02);
    A.sfxBus.gain.setTargetAtTime(A.sfxVol * 0.9, t, 0.02);
  };
  A.setMusicVol = function (v) { A.musicVol = SP.clamp(v, 0, 1); A.applyVolumes(); };
  A.setSfxVol = function (v) { A.sfxVol = SP.clamp(v, 0, 1); A.applyVolumes(); };

  // ---------- Primitivas de síntesis ----------
  function tone(o) {
    var ctx = A.ctx;
    var t = o.t !== undefined ? o.t : ctx.currentTime;
    var osc = ctx.createOscillator();
    if (A.waves[o.type]) osc.setPeriodicWave(A.waves[o.type]);
    else osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    var d = o.d || 0.1;
    if (o.f2) {
      var end = t + (o.slide || d);
      if (o.lin) osc.frequency.linearRampToValueAtTime(o.f2, end);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(5, o.f2), end);
    }
    var g = ctx.createGain();
    var v = o.v || 0.2, a = o.a || 0.004, r = o.r || 0.04;
    var s = o.s !== undefined ? o.s : 1;
    var dec = o.dec || 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    if (s < 1) {
      var decEnd = Math.min(t + a + dec, t + d);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * s), decEnd);
      g.gain.setValueAtTime(Math.max(0.0001, v * s), t + d);
    } else {
      g.gain.setValueAtTime(v, t + d);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + r);
    if (o.vib) {
      var lfo = ctx.createOscillator();
      var lg = ctx.createGain();
      lfo.frequency.value = o.vibRate || 5.5;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(o.f * o.vib, t + Math.min(0.25, d));
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + d + r + 0.05);
    }
    osc.connect(g);
    g.connect(o.dest || A.sfxBus);
    if (o.send) g.connect(o.send);
    osc.start(t);
    osc.stop(t + d + r + 0.05);
    osc.onended = function () { try { g.disconnect(); } catch (e) { /* nada */ } };
  }

  function noise(o) {
    var ctx = A.ctx;
    var t = o.t !== undefined ? o.t : ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = o.filter || 'highpass';
    f.frequency.setValueAtTime(o.fq || 1000, t);
    if (o.fq2) f.frequency.exponentialRampToValueAtTime(o.fq2, t + o.d);
    f.Q.value = o.q || 0.8;
    var g = ctx.createGain();
    var v = o.v || 0.2, d = o.d || 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.a || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest || A.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + d + 0.05);
    src.onended = function () { try { g.disconnect(); } catch (e) { /* nada */ } };
  }

  function arp(notes, step, o, t0) {
    for (var i = 0; i < notes.length; i++) {
      tone(Object.assign({}, o, { f: A.freq(notes[i]), t: t0 + i * step }));
    }
  }

  // ---------- Efectos de sonido ----------
  var S = {};
  S.shoot = function (t) {
    tone({ type: 'p25', f: 300, f2: 1250, d: 0.1, v: 0.11, t: t, r: 0.03 });
    tone({ type: 'sine', f: 620, f2: 2300, d: 0.13, v: 0.06, t: t + 0.012, r: 0.04 });
  };
  S.sticky = function (t) {
    tone({ type: 'p12', f: 500, f2: 1600, d: 0.12, v: 0.1, t: t });
    tone({ type: 'sine', f: 1000, f2: 3000, d: 0.16, v: 0.05, t: t + 0.02 });
  };
  S.vulcan = function (t) {
    tone({ type: 'p12', f: 1000, f2: 1700, d: 0.035, v: 0.055, t: t, r: 0.02 });
  };
  S.stick = function (t) {
    tone({ type: 'triangle', f: 1600, d: 0.04, v: 0.12, t: t, r: 0.08 });
  };
  S.pop = function (t, p) {
    var f = A.freq(p.midi);
    tone({ type: 'triangle', f: f, d: 0.14, v: 0.3, t: t, r: 0.14 });
    tone({ type: 'p25', f: f * 2, d: 0.05, v: 0.08, t: t, r: 0.07 });
    noise({ filter: 'highpass', fq: 2600, d: 0.05, v: 0.14, t: t });
    if (p.size <= 1) tone({ type: 'sine', f: 160, f2: 50, d: 0.14, v: 0.32, t: t });
  };
  S.split = S.pop;
  S.gem = function (t, p) {
    var f = A.freq(p.midi);
    tone({ type: 'sine', f: f * 2, d: 0.05, v: 0.16, t: t, r: 0.25 });
    tone({ type: 'p12', f: f, d: 0.08, v: 0.1, t: t, r: 0.1 });
    noise({ filter: 'highpass', fq: 5000, d: 0.08, v: 0.1, t: t });
  };
  S.item = function (t) { arp([84, 88, 91], 0.045, { type: 'p25', d: 0.05, v: 0.12 }, t); };
  S.points = function (t) { arp([83, 88], 0.06, { type: 'p25', d: 0.06, v: 0.12 }, t); };
  S.weapon = function (t) { arp([72, 79, 84, 88, 91], 0.04, { type: 'p25', d: 0.05, v: 0.12 }, t); };
  S.oneup = function (t) { arp([76, 79, 88, 84, 86, 91], 0.075, { type: 'p50', d: 0.07, v: 0.12 }, t); };
  S.shield = function (t) {
    tone({ type: 'sine', f: 880, f2: 1760, d: 0.25, v: 0.12, t: t, vib: 0.02, vibRate: 12 });
    tone({ type: 'sine', f: 1320, d: 0.3, v: 0.07, t: t + 0.05 });
  };
  S.shieldbreak = function (t) {
    noise({ filter: 'bandpass', fq: 3200, q: 2, d: 0.3, v: 0.25, t: t });
    tone({ type: 'square', f: 700, f2: 150, d: 0.25, v: 0.1, t: t });
  };
  S.freeze = function (t) {
    arp([91, 86, 79, 74], 0.05, { type: 'triangle', d: 0.08, v: 0.18 }, t);
    noise({ filter: 'highpass', fq: 7000, d: 0.4, v: 0.08, t: t });
  };
  S.slow = function (t) {
    tone({ type: 'p25', f: 900, f2: 300, d: 0.4, v: 0.1, t: t, vib: 0.03, vibRate: 8 });
  };
  S.boom = function (t) {
    tone({ type: 'sine', f: 140, f2: 32, d: 0.7, v: 0.6, t: t });
    tone({ type: 'square', f: 70, f2: 30, d: 0.35, v: 0.14, t: t });
    noise({ filter: 'lowpass', fq: 1800, fq2: 120, d: 0.8, v: 0.5, t: t });
    noise({ filter: 'highpass', fq: 3000, d: 0.3, v: 0.12, t: t + 0.02 });
    tone({ type: 'sine', f: 300, f2: 2400, d: 0.5, v: 0.06, t: t + 0.05 });
  };
  S.dynamite = function (t) {
    noise({ filter: 'lowpass', fq: 3000, fq2: 200, d: 0.6, v: 0.45, t: t });
    tone({ type: 'sine', f: 110, f2: 40, d: 0.5, v: 0.45, t: t });
  };
  S.death = function (t) {
    tone({ type: 'square', f: 760, f2: 90, d: 0.9, v: 0.21, t: t, vib: 0.05, vibRate: 14 });
    noise({ filter: 'bandpass', fq: 900, d: 0.25, v: 0.15, t: t });
  };
  S.hurt = function (t) {
    tone({ type: 'square', f: 500, f2: 200, d: 0.2, v: 0.14, t: t });
    noise({ filter: 'bandpass', fq: 1400, d: 0.15, v: 0.15, t: t });
  };
  S.bosshit = function (t) {
    tone({ type: 'square', f: 260, f2: 120, d: 0.08, v: 0.14, t: t });
    noise({ filter: 'bandpass', fq: 2200, q: 3, d: 0.09, v: 0.2, t: t });
    tone({ type: 'sine', f: 1800, d: 0.03, v: 0.06, t: t, r: 0.12 });
  };
  S.bossdie = function (t) {
    S.boom(t);
    S.boom(t + 0.35);
    arp([60, 64, 67, 72, 76, 79, 84, 88, 91, 96], 0.07, { type: 'p25', d: 0.08, v: 0.1 }, t + 0.6);
  };
  S.glass = function (t) {
    noise({ filter: 'highpass', fq: 3500, d: 0.3, v: 0.32, t: t });
    for (var i = 0; i < 4; i++) tone({ type: 'sine', f: 2000 + Math.random() * 3000, d: 0.02, v: 0.08, t: t + i * 0.03, r: 0.1 });
  };
  S.block = function (t) {
    tone({ type: 'square', f: 180, f2: 140, d: 0.04, v: 0.06, t: t });
  };
  S.tick = function (t) { tone({ type: 'p25', f: 1320, d: 0.04, v: 0.09, t: t }); };
  S.hurry = function (t) {
    for (var i = 0; i < 3; i++) {
      tone({ type: 'p25', f: 988, d: 0.07, v: 0.1, t: t + i * 0.18 });
      tone({ type: 'p25', f: 740, d: 0.07, v: 0.1, t: t + i * 0.18 + 0.09 });
    }
  };
  S.ready = function (t) { tone({ type: 'p25', f: 659, d: 0.1, v: 0.12, t: t }); };
  S.go = function (t) {
    tone({ type: 'p25', f: 988, d: 0.22, v: 0.13, t: t });
    tone({ type: 'p25', f: 1319, d: 0.22, v: 0.08, t: t });
  };
  S.move = function (t) { tone({ type: 'p12', f: 660, d: 0.03, v: 0.08, t: t }); };
  S.select = function (t) { arp([81, 88], 0.05, { type: 'p25', d: 0.05, v: 0.11 }, t); };
  S.back = function (t) { tone({ type: 'p25', f: 660, f2: 440, d: 0.08, v: 0.1, t: t }); };
  S.type = function (t) { tone({ type: 'p12', f: 1100 + Math.random() * 200, d: 0.02, v: 0.07, t: t }); };
  S.error = function (t) { tone({ type: 'square', f: 180, d: 0.15, v: 0.1, t: t }); };
  S.land = function (t) { tone({ type: 'triangle', f: 220, f2: 140, d: 0.05, v: 0.12, t: t }); };
  S.warn = function (t) {
    tone({ type: 'square', f: 440, d: 0.08, v: 0.08, t: t });
    tone({ type: 'square', f: 330, d: 0.08, v: 0.08, t: t + 0.1 });
  };
  S.slam = function (t) {
    tone({ type: 'sine', f: 120, f2: 40, d: 0.3, v: 0.5, t: t });
    noise({ filter: 'lowpass', fq: 900, fq2: 100, d: 0.35, v: 0.35, t: t });
  };
  S.blow = function (t) {
    noise({ filter: 'bandpass', fq: 600, fq2: 1600, q: 1.5, d: 0.35, v: 0.18, t: t });
    tone({ type: 'sine', f: 300, f2: 700, d: 0.3, v: 0.08, t: t });
  };
  S.whoosh = function (t) { noise({ filter: 'bandpass', fq: 400, fq2: 3000, q: 1, d: 0.3, v: 0.15, t: t }); };
  S.charge = function (t) { arp([72, 76, 79, 84], 0.04, { type: 'p12', d: 0.04, v: 0.09 }, t); };
  S.presents = function (t) {
    arp([60, 67, 72, 76, 79, 84], 0.06, { type: 'p25', d: 0.18, v: 0.08, r: 0.4 }, t);
    tone({ type: 'triangle', f: A.freq(48), d: 0.8, v: 0.25, t: t, r: 0.6 });
  };
  S.coin = function (t) { arp([83, 88], 0.07, { type: 'p50', d: 0.07, v: 0.1 }, t); };
  S.combo = function (t, p) {
    tone({ type: 'p12', f: A.freq(p.midi + 12), d: 0.05, v: 0.06, t: t + 0.03 });
  };
  S.tally = function (t) { tone({ type: 'p25', f: 1760, d: 0.02, v: 0.05, t: t }); };

  var lastPlay = {};
  A.sfx = function (name, p) {
    if (!A.ready || A.sfxVol <= 0) return;
    var fn = S[name];
    if (!fn) return;
    var now = A.ctx.currentTime;
    var rec = lastPlay[name] || (lastPlay[name] = { t: 0, n: 0 });
    if (now - rec.t < 0.035) {
      rec.n++;
      if (rec.n > 3) return; // limitar ráfagas
    } else {
      rec.t = now;
      rec.n = 0;
    }
    try { fn(now + 0.005, p || {}); } catch (e) { /* nada */ }
  };

  // Nota para el reventón de burbujas: pentatónica en la tonalidad de la canción
  var PENTA_MAJ = [0, 2, 4, 7, 9], PENTA_MIN = [0, 3, 5, 7, 10];
  A.popNote = function (index, size) {
    var sc = A.songScale === 'minor' ? PENTA_MIN : PENTA_MAJ;
    var i = Math.max(0, index + (size === 0 ? -1 : 0));
    i = Math.min(i, 11);
    var base = A.songRoot % 12 + 72; // octava 5
    return base + sc[i % 5] + 12 * Math.floor(i / 5) - 12;
  };

  // ---------- Secuenciador de música ----------
  var QUAL = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
    'dim': [0, 3, 6], 'aug': [0, 4, 8], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7], '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9], 'add9': [0, 4, 7, 14], '5': [0, 7, 12]
  };
  function parseChord(sym) {
    var m = /^([A-G])([#b]?)(.*)$/.exec(sym);
    if (!m) return { pc: 0, iv: QUAL[''] };
    var pc = (SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
    return { pc: pc, iv: QUAL[m[3]] || QUAL[''] };
  }

  var DRUMS = {
    none: '................',
    rock: 'x.h.S.h.x.x.S.h.', rockF: 'x.h.S.h.x.S.SSSS',
    pop: 'x.h.S.hkx.hkS.h.', popF: 'x.h.S.hkx.hkSSSS',
    disco: 'x.o.X.o.x.o.X.o.', discoF: 'x.o.X.o.x.oSXSSS',
    funk: 'x.hkS.hh.kx.S.hh', funkF: 'x.hkS.hh.kx.SSSS',
    boss: 'xhxhShxhxhxhShSS', bossF: 'xhxhShxhSSSSSSSS',
    half: 'x.h.h.h.S.h.h.h.', halfF: 'x.h.h.h.S.h.SSSS',
    fanfare: 'x.h.S.h.x.h.S.SS', fanfareF: 'c...............',
    march: 'x.h.h.h.S.h.h.hh', marchF: 'x.h.h.h.S.SSSSSS'
  };
  var BASS = {
    none: '----------------',
    octave: 'R.O.R.O.R.O.R.O.',
    drive: 'R.R.R.R.R.R.R.R.',
    walk: 'R.R.5.R.O.R.5.3.',
    funk: 'R..R..O.-.R.5.O.',
    half: 'R.......5.......',
    boss: 'R.RRO.R.R.RRO.5.',
    pop: 'R.-RR.-RR.-RO.5.',
    whole: 'R...............',
    pump: 'R...R...R...R...'
  };
  var ARP = {
    none: '----------------',
    up16: '0123012301230123',
    up8: '0.1.2.3.0.1.2.3.',
    stab: '--C.--C.--C.--C.',
    roll: '0121012101210121',
    pulse: 'C...C...C...C...'
  };

  function compileSong(song) {
    var stepsPerBar = 16;
    var order = song.order.split(/\s+/);
    var bars = [];
    order.forEach(function (pid) {
      var part = song.parts[pid];
      var chords = part.chords.split(/\s+/);
      var leadBars = part.lead ? part.lead.split('|') : [];
      for (var b = 0; b < chords.length; b++) {
        bars.push({
          chord: chords[b], lead: (leadBars[b] || '').trim(), part: part,
          last: b === chords.length - 1
        });
      }
    });
    var total = bars.length * stepsPerBar;
    var steps = [];
    for (var i = 0; i < total; i++) steps.push([]);

    // Melodía
    var leadTokens = [];
    bars.forEach(function (bar) {
      var toks = bar.lead ? bar.lead.split(/\s+/) : [];
      for (var k = 0; k < 8; k++) {
        var tk = toks[k] || '-';
        if (tk.indexOf('/') >= 0) {
          var hh = tk.split('/');
          leadTokens.push(hh[0], hh[1]);
        } else {
          leadTokens.push(tk, tk === '-' ? '-' : '.');
        }
      }
    });
    var oct = (song.lead && song.lead.oct) || 0;
    for (var s = 0; s < leadTokens.length; s++) {
      var tok = leadTokens[s];
      if (tok === '.' || tok === '-') continue;
      var midi = A.midi(tok);
      if (midi === null) continue;
      var len = 1;
      while (s + len < leadTokens.length && leadTokens[s + len] === '.') len++;
      steps[s].push({ ch: 'lead', m: midi + oct * 12, len: len });
    }

    // Bajo, arpegio y batería a partir de los acordes
    bars.forEach(function (bar, bi) {
      var base = bi * stepsPerBar;
      var c = parseChord(bar.chord);
      var bassRoot = 36 + c.pc;
      if (bassRoot > 43) bassRoot -= 12;
      var arpRoot = 60 + c.pc;
      if (arpRoot > 66) arpRoot -= 12;
      var tones = [arpRoot + c.iv[0], arpRoot + c.iv[1], arpRoot + c.iv[2], arpRoot + 12];

      var bp = BASS[bar.part.bass || 'drive'];
      for (var i2 = 0; i2 < 16; i2++) {
        var ch = bp[i2];
        if (ch === '.' || ch === '-') continue;
        var n = bassRoot;
        if (ch === 'O') n = bassRoot + 12;
        else if (ch === '5') n = bassRoot + 7;
        else if (ch === '3') n = bassRoot + c.iv[1];
        var l = 1;
        while (i2 + l < 16 && bp[i2 + l] === '.') l++;
        steps[base + i2].push({ ch: 'bass', m: n, len: l });
      }

      var ap = ARP[bar.part.arp || 'none'];
      for (var i3 = 0; i3 < 16; i3++) {
        var ca = ap[i3];
        if (ca === '.' || ca === '-') continue;
        var l2 = 1;
        while (i3 + l2 < 16 && ap[i3 + l2] === '.') l2++;
        if (ca === 'C') {
          for (var q = 0; q < 3; q++) steps[base + i3].push({ ch: 'arp', m: tones[q] + 12, len: l2 });
        } else {
          steps[base + i3].push({ ch: 'arp', m: tones[parseInt(ca, 10)] + 12, len: l2 });
        }
      }

      var dname = bar.part.drums || 'none';
      var dp = (bar.last && bar.part.fill && DRUMS[dname + 'F']) ? DRUMS[dname + 'F'] : DRUMS[dname];
      for (var i4 = 0; i4 < 16; i4++) {
        var cd = dp[i4];
        if (cd !== '.') steps[base + i4].push({ ch: 'drum', k: cd });
      }
    });

    return { steps: steps, total: total, stepDur: 60 / song.bpm / 4, song: song };
  }

  var seq = { comp: null, step: 0, next: 0, timer: null, gain: null, start: 0, loop: true, onEnd: null, id: null };

  function playDrum(k, t, dest) {
    var kick = k === 'x' || k === 'k' || k === 'X';
    var snare = k === 's' || k === 'S' || k === 'X';
    var hat = k === 'h' || k === 'x' || k === 'S';
    if (kick) {
      tone({ type: 'sine', f: 150, f2: 42, slide: 0.11, d: 0.12, v: 0.55, t: t, r: 0.08, dest: dest });
      noise({ filter: 'lowpass', fq: 1500, d: 0.02, v: 0.12, t: t, dest: dest });
    }
    if (snare) {
      noise({ filter: 'bandpass', fq: 1900, q: 0.7, d: 0.13, v: 0.32, t: t, dest: dest });
      tone({ type: 'triangle', f: 200, f2: 160, d: 0.06, v: 0.18, t: t, dest: dest });
    }
    if (hat) noise({ filter: 'highpass', fq: 7500, d: 0.035, v: 0.1, t: t, dest: dest });
    if (k === 'o') noise({ filter: 'highpass', fq: 6500, d: 0.14, v: 0.08, t: t, dest: dest });
    if (k === 'c') noise({ filter: 'highpass', fq: 4500, d: 0.9, v: 0.14, t: t, dest: dest });
  }

  function scheduleStep(idx, t) {
    var comp = seq.comp, song = comp.song;
    var evs = comp.steps[idx];
    var sd = comp.stepDur;
    var L = song.lead || {}, B = song.bass || {}, R = song.arp || {}, D = song.drums || {};
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.ch === 'lead') {
        tone({
          type: L.wave || 'p25', f: A.freq(e.m), t: t, d: Math.max(0.04, e.len * sd * 0.9),
          v: L.vol || 0.14, a: 0.006, s: 0.72, dec: 0.12, r: 0.05,
          vib: e.len >= 3 ? (L.vib !== undefined ? L.vib : 0.006) : 0, vibRate: 5.5,
          dest: seq.gain, send: L.echo === false ? null : A.echo
        });
      } else if (e.ch === 'bass') {
        tone({
          type: B.wave || 'p50', f: A.freq(e.m), t: t, d: Math.max(0.04, e.len * sd * 0.82),
          v: B.vol || 0.13, a: 0.004, s: 0.65, dec: 0.09, r: 0.03, dest: seq.bassGain
        });
      } else if (e.ch === 'arp') {
        tone({
          type: R.wave || 'p12', f: A.freq(e.m), t: t, d: Math.min(e.len, 2) * sd * 0.8,
          v: R.vol || 0.045, a: 0.003, s: 0.5, dec: 0.05, r: 0.03, dest: seq.gain
        });
      } else if (e.ch === 'drum') {
        if (D.vol !== 0) playDrum(e.k, t, seq.drumGain);
      }
    }
  }

  function tick() {
    if (!seq.comp || !A.ready) return;
    var ctx = A.ctx;
    while (seq.next < ctx.currentTime + 0.13) {
      if (seq.step >= seq.comp.total) {
        if (seq.loop) {
          seq.step = 0;
        } else {
          var cb = seq.onEnd;
          var endAt = seq.next;
          seq.comp = null;
          clearInterval(seq.timer);
          seq.timer = null;
          if (cb) setTimeout(cb, Math.max(0, (endAt - ctx.currentTime) * 1000));
          return;
        }
      }
      scheduleStep(seq.step, seq.next);
      seq.next += seq.comp.stepDur;
      seq.step++;
    }
  }

  var compiled = {};
  A.playSong = function (id, opts) {
    opts = opts || {};
    if (!A.ready) { A.pending = { id: id, opts: opts }; A.current = id; return; }
    if (A.current === id && seq.comp && !opts.restart) return;
    A.stopSong();
    var song = SP.songs && SP.songs[id];
    if (!song) return;
    var comp = compiled[id] || (compiled[id] = compileSong(song));
    var ctx = A.ctx;
    seq.gain = ctx.createGain();
    seq.gain.gain.value = song.gain || 1;
    seq.gain.connect(A.musicBus);
    seq.bassGain = ctx.createGain();
    seq.bassGain.gain.value = 1;
    var bf = ctx.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.value = (song.bass && song.bass.cut) || 1300;
    seq.bassGain.connect(bf);
    bf.connect(seq.gain);
    seq.drumGain = ctx.createGain();
    seq.drumGain.gain.value = (song.drums && song.drums.vol) || 0.9;
    seq.drumGain.connect(seq.gain);
    seq.comp = comp;
    seq.step = 0;
    seq.next = ctx.currentTime + 0.06;
    seq.start = seq.next;
    seq.loop = opts.loop !== undefined ? opts.loop : song.loop !== false;
    seq.onEnd = opts.onEnd || null;
    A.current = id;
    A.songRoot = A.midi((song.root || 'C') + '4');
    A.songScale = song.scale || 'major';
    A.bpm = song.bpm;
    if (A.echo) A.echo.delayTime.setValueAtTime(Math.min(0.9, (60 / song.bpm) * 0.75), ctx.currentTime);
    seq.timer = setInterval(tick, 25);
    tick();
  };

  A.stopSong = function (fade) {
    A.current = null;
    A.pending = null;
    if (seq.timer) { clearInterval(seq.timer); seq.timer = null; }
    seq.comp = null;
    if (seq.gain && A.ready) {
      var g = seq.gain, t = A.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.06));
      setTimeout(function () { try { g.disconnect(); } catch (e) { /* nada */ } }, (fade || 0.06) * 1000 + 400);
      seq.gain = null;
    }
  };

  A.isPlaying = function () { return !!seq.comp; };

  // Posición musical en pulsos (para que los gráficos sigan el ritmo)
  A.beat = function () {
    if (!A.ready || !seq.comp) return (performance.now() / 1000) * 2.2;
    return (A.ctx.currentTime - seq.start) / (seq.comp.stepDur * 4);
  };

  // Niveles del espectro (0..1) para ecualizadores
  A.levels = function (n, out) {
    out = out || [];
    if (A.ready && seq.comp) {
      A.analyser.getByteFrequencyData(A.freqData);
      var bins = A.freqData.length * 0.7;
      for (var i = 0; i < n; i++) {
        var a = Math.floor(Math.pow(i / n, 1.6) * bins), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * bins));
        var sum = 0;
        for (var j = a; j < b; j++) sum += A.freqData[j];
        out[i] = Math.min(1, sum / (b - a) / 220);
      }
    } else {
      var bt = A.beat();
      for (var k = 0; k < n; k++) {
        out[k] = 0.25 + 0.25 * Math.sin(bt * Math.PI * 2 + k * 0.7) * Math.cos(bt * 1.3 + k);
      }
    }
    return out;
  };
})();
