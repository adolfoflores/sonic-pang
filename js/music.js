/* =========================================================
   SONIC PANG — música original (chiptune)
   Melodía en corcheas por compás (8 casillas). "." liga, "-" silencio,
   "C5/D5" = dos semicorcheas en una casilla.
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;

  SP.songs = {
    // Tema principal: alegre, en Do mayor
    title: {
      bpm: 150, root: 'C', scale: 'major',
      lead: { wave: 'p25', vol: 0.13, vib: 0.007 },
      bass: { wave: 'p50', vol: 0.12 },
      arp: { wave: 'p12', vol: 0.04 },
      drums: { vol: 0.85 },
      parts: {
        A: {
          chords: 'C G Am F C G F G', bass: 'octave', arp: 'up16', drums: 'pop', fill: true,
          lead: 'G5 . E5 G5 C6 . B5 G5 | D6 . B5 . G5 A5 B5 D6 | C6 . A5 . E5 . A5 B5 | C6 . . . A5 . F5 G5 |' +
                'E5 . G5 . C6 . E6 . | D6 . . B5 G5 . D6 . | C6 . A5 . F5 . A5 C6 | B5 . . . D6 . . .'
        },
        B: {
          chords: 'Am F C G Am F C G', bass: 'pop', arp: 'stab', drums: 'pop', fill: true,
          lead: 'A5 . . . E5 . A5 . | C6 . . . A5 . F5 . | G5 . . . E5 . G5 . | B5 . A5 . G5 . D5 . |' +
                'A5 . B5 . C6 . E6 . | F6 . E6 . C6 . A5 . | G5 . E5 . G5 . C6 . | D6 . . . - - G5/A5 B5'
        }
      },
      order: 'A A B A'
    },

    // Mundos 1 y 2: barrio y playa (Sol mayor)
    stageA: {
      bpm: 142, root: 'G', scale: 'major',
      lead: { wave: 'p25', vol: 0.13 },
      bass: { wave: 'p50', vol: 0.12 },
      arp: { wave: 'p12', vol: 0.035 },
      drums: { vol: 0.8 },
      parts: {
        A: {
          chords: 'C D Bm Em C D G G', bass: 'walk', arp: 'up8', drums: 'rock', fill: true,
          lead: 'E5 . G5 . C6 . B5 . | A5 . F#5 . D5 . F#5 A5 | B5 . . . A5 . F#5 . | G5 . . . E5 . . . |' +
                'E5 . G5 . C6 . E6 . | D6 . C6 . A5 . F#5 . | G5 . B5 . D6 . B5 . | G5 . . . - - - -'
        },
        B: {
          chords: 'Em C G D Em C G D', bass: 'octave', arp: 'up16', drums: 'pop', fill: true,
          lead: 'B5 . . G5 E5 . G5 . | C6 . . . G5 . E5 . | D6 . . B5 G5 . B5 . | A5 . . . F#5 . A5 . |' +
                'B5 . E6 . D6 . B5 . | C6 . E6 . G6 . E6 . | D6 . B5 . G5 . B5 . | A5 . . . D6 . . .'
        }
      },
      order: 'A A B A B'
    },

    // Mundos 3 y 4: ciudad de noche y desierto (La menor, funky)
    stageB: {
      bpm: 126, root: 'A', scale: 'minor',
      lead: { wave: 'p25', vol: 0.14, oct: 1, vib: 0.008 },
      bass: { wave: 'p50', vol: 0.14, cut: 1100 },
      arp: { wave: 'p12', vol: 0.04 },
      drums: { vol: 0.9 },
      parts: {
        A: {
          chords: 'Am F G Em Am F G E', bass: 'funk', arp: 'stab', drums: 'funk', fill: true,
          lead: 'A4 . C5 E5 . . D5 C5 | C5 . A4 . . . - - | B4 . D5 G5 . . F5 D5 | E5 . . . - - B4 D5 |' +
                'E5 . A5 . G5 . E5 . | F5 . E5 . C5 . A4 . | D5 . G5 . B5 . D6 . | B5 . . . G#5 . E5 .'
        },
        B: {
          chords: 'Dm Am F E Dm Am F E', bass: 'funk', arp: 'roll', drums: 'funk', fill: true,
          lead: 'F5 . . A5 . . D6 . | C6 . . . A5 . E5 . | F5 . . A5 . . C6 . | B5 . . . G#5 . . . |' +
                'D6 . C6 . A5 . F5 . | E5 . . . C5 . A4 . | F5 . A5 . C6 . F6 . | E6 . . . D6/C6 B5 G#5 .'
        }
      },
      order: 'A A B A'
    },

    // Mundos 5 y 6: antro y espacio (Re menor, eurodance)
    stageC: {
      bpm: 140, root: 'D', scale: 'minor',
      lead: { wave: 'p25', vol: 0.13 },
      bass: { wave: 'p50', vol: 0.13 },
      arp: { wave: 'p12', vol: 0.035 },
      drums: { vol: 0.95 },
      parts: {
        A: {
          chords: 'Dm Bb F C Dm Bb F C', bass: 'octave', arp: 'up16', drums: 'disco', fill: true,
          lead: 'D5 . F5 A5 . F5 D5 . | D5 . F5 Bb5 . F5 D5 . | C5 . F5 A5 . F5 C6 . | E5 . G5 C6 . . E5 G5 |' +
                'A5 . . . F5 . D5 . | Bb5 . . . F5 . D5 . | C6 . . . A5 . F5 . | G5 . E5 . C5 . E5 G5'
        },
        B: {
          chords: 'Gm Dm Bb C Gm Dm Bb A', bass: 'octave', arp: 'up16', drums: 'disco', fill: true,
          lead: 'G5 . Bb5 . D6 . Bb5 . | A5 . . . F5 . D5 . | F5 . Bb5 . D6 . F6 . | E6 . . . C6 . G5 . |' +
                'Bb5 . A5 . G5 . D5 . | F5 . E5 . D5 . A4 . | Bb4 . D5 . F5 . Bb5 . | A5 . . . C#6 . E6 .'
        }
      },
      order: 'A A B A B'
    },

    // Jefes (Mi menor, tenso)
    boss: {
      bpm: 160, root: 'E', scale: 'minor',
      lead: { wave: 'p25', vol: 0.13, vib: 0.01 },
      bass: { wave: 'p50', vol: 0.14 },
      arp: { wave: 'p12', vol: 0.04 },
      drums: { vol: 0.95 },
      parts: {
        A: {
          chords: 'Em C Am B Em C Am B', bass: 'boss', arp: 'roll', drums: 'boss', fill: true,
          lead: 'E5 E5 . G5 . E5 B5 . | C6 . B5 . G5 . E5 . | A5 A5 . C6 . A5 E6 . | D#6 . . . B5 . F#5 . |' +
                'G5 . F#5 . E5 . B4 . | C5 . E5 . G5 . C6 . | B5 . A5 . E5 . C5 . | D#5 . F#5 . B5 . D#6 .'
        },
        B: {
          chords: 'C D Em Em C D B B', bass: 'boss', arp: 'up16', drums: 'boss', fill: true,
          lead: 'G5 . . . E5 . G5 . | A5 . . . F#5 . A5 . | B5 . . . G5 . E5 . | B5 . C6 . B5 . G5 . |' +
                'E6 . . . C6 . G5 . | F#6 . . . D6 . A5 . | F#6 . . . D#6 . B5 . | B5 . A5 . G5 . F#5 .'
        }
      },
      order: 'A A B A'
    },

    // Final y créditos (Fa mayor, nostálgico)
    ending: {
      bpm: 108, root: 'F', scale: 'major',
      lead: { wave: 'p25', vol: 0.13, vib: 0.008 },
      bass: { wave: 'p50', vol: 0.12 },
      arp: { wave: 'p12', vol: 0.04 },
      drums: { vol: 0.7 },
      parts: {
        A: {
          chords: 'F C Dm Bb F C Bb C', bass: 'half', arp: 'up8', drums: 'half', fill: true,
          lead: 'A5 . . . C6 . A5 . | G5 . . . E5 . C5 . | F5 . . . A5 . D6 . | D6 . C6 . Bb5 . A5 . |' +
                'A5 . . . C6 . F6 . | E6 . . . D6 . C6 . | D6 . . . Bb5 . G5 . | C6 . . . . . . .'
        },
        B: {
          chords: 'Dm Am Bb F Dm Am Bb C', bass: 'walk', arp: 'up16', drums: 'half', fill: true,
          lead: 'F5 . . . A5 . . . | E5 . . . C5 . . . | D5 . F5 . Bb5 . D6 . | C6 . . . A5 . . . |' +
                'D6 . . . F6 . . . | E6 . . . C6 . A5 . | Bb5 . . . D6 . F6 . | E6 . . . G5 . . .'
        }
      },
      order: 'A B A B'
    },

    // Fanfarria de nivel completado (sin bucle)
    clear: {
      bpm: 150, root: 'C', scale: 'major', loop: false,
      lead: { wave: 'p25', vol: 0.15, echo: false },
      bass: { wave: 'p50', vol: 0.12 },
      arp: { wave: 'p12', vol: 0.05 },
      drums: { vol: 0.9 },
      parts: {
        A: {
          chords: 'C G C', bass: 'pump', arp: 'up16', drums: 'fanfare', fill: true,
          lead: 'C5/E5 G5/C6 E6 . . G5 C6 . | D6 . B5 . G5 . D6 . | C6 . . . . . - -'
        }
      },
      order: 'A'
    },

    // Mundo completado (sin bucle, un poco más larga)
    worldclear: {
      bpm: 140, root: 'G', scale: 'major', loop: false,
      lead: { wave: 'p25', vol: 0.15, echo: false },
      bass: { wave: 'p50', vol: 0.12 },
      arp: { wave: 'p12', vol: 0.05 },
      drums: { vol: 0.9 },
      parts: {
        A: {
          chords: 'G C D G', bass: 'octave', arp: 'up16', drums: 'pop', fill: false,
          lead: 'G5 . B5 . D6 . G6 . | E6 . . C6 . . E6 . | F#6 . . D6 . . A5 . | G6 . . . . . - -'
        }
      },
      order: 'A'
    },

    // Game over (sin bucle)
    gameover: {
      bpm: 96, root: 'A', scale: 'minor', loop: false,
      lead: { wave: 'p25', vol: 0.14 },
      bass: { wave: 'p50', vol: 0.12 },
      drums: { vol: 0 },
      parts: {
        A: {
          chords: 'Am G Am', bass: 'whole', arp: 'none', drums: 'none',
          lead: 'A5 . G5 . E5 . C5 . | D5 . . . B4 . . . | A4 . . . . . - -'
        }
      },
      order: 'A'
    }
  };

  // Canción por mundo
  SP.worldSong = ['stageA', 'stageA', 'stageB', 'stageB', 'stageC', 'stageC'];
})();
