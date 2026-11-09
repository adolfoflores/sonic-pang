# Contribuir

Gracias por ayudar a mejorar Sonic Pang. Para proponer un cambio, abre un issue
con el problema o envía un pull request que explique el cambio y cómo probarlo.
En los errores, indica el navegador, el dispositivo, el nivel y los pasos para
reproducirlos. Usa partidas de prueba al compartir capturas o datos de guardado.

## Desarrollo local

Necesitas Python 3 para el servidor y Node.js 24 o posterior para las pruebas.
No hay dependencias que instalar ni un paso de compilación.

```bash
python3 tools/serve.py
node tests/store.js
node tests/sim.js
```

Abre <http://localhost:8642> para jugar. Para revisar el dibujo, abre
`tools/arcade-preview.html`; incluye las 24 pantallas y los 30 niveles sin leer ni
escribir el guardado del jugador. `tools/sprites.html` muestra los sprites.

## Convenciones

- Conserva el estilo del archivo que modificas: JavaScript clásico sin módulos,
  dos espacios y comentarios en español; Python usa cuatro espacios.
- Los scripts comparten el espacio de nombres `SP`. Su orden en `index.html`
  importa; conserva también el orden del banco visual si añades un script.
- Sigue [la guía visual](design.md). Evita añadir dependencias para cambios que
  se puedan resolver con las APIs del navegador.
- Si cambias reglas, colisiones o guardado, ejecuta las pruebas anteriores.
  La simulación usa un bot invencible; no certifica que la dificultad sea adecuada
  para una persona. `--mortal` permite explorar esa dificultad.
- Si cambias la presentación, revisa el banco visual y los controles táctiles.
- Incluye pruebas cuando protejan un comportamiento relevante y evita cambios
  ajenos al propósito del pull request.
- No incluyas credenciales, configuraciones personales, partidas reales ni
  recursos de terceros sin documentar su origen y licencia.

Las contribuciones originales se publican bajo la [licencia MIT](LICENSE).
Consulta también los [créditos y referencias de terceros](THIRD_PARTY_NOTICES.md).
