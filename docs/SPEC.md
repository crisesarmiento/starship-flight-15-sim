# Simulación Starship Flight 15

**Aviso:** esto es una aproximación educativa y visual, armada con datos públicos. No es un producto oficial de SpaceX, no usa telemetría interna y no sirve para operación, seguridad ni análisis forense del vuelo. Si un número no tiene fuente, no se inventa: se marca como estimación o se deja vacío.

Investigación cerrada el 19 de noviembre de 2026 (hora de Córdoba, UTC−3). El vuelo ya ocurrió: no hace falta basarse en un plan anunciado ni en un vuelo anterior.

## 1. Objetivo

Hacer un proyecto nuevo en GitHub, en three.js, que muestre de forma realista el lanzamiento y el regreso del Starship Flight 15: ascenso del Super Heavy, hot-staging, regreso del booster (con el desvío real, no una catch que no pasó), costa orbital de la nave, reentrada y catch de la Ship en la torre de Pad 2.

El proyecto también sirve para evaluar el preset de OpenCode que va a usar Cristian: un orquestador (con revisiones tipo Oracle) y un implementador/fixer. El orquestador planea, reparte y revisa. El implementador escribe el código por etapas. Al final hay que anotar cómo le fue a cada rol, sin aplicar cambios al stack de modelos.

Cristian implementa con OpenCode. Este documento es el spec, no el código.

## 2. Qué pasó en el vuelo real

El Flight 15 despegó el viernes 13 de noviembre de 2026 desde Pad 2, Starbase, Texas. La prensa ubica el despegue alrededor de las 16:47 CST (22:47 UTC; 19:47 hora de Córdoba). SpaceX no publicó el segundo exacto en la página de la misión. Algunos recuentos (por ejemplo Wikipedia) dan 22:47:36 UTC, pero la nota al pie no respalda bien ese segundo, así que el dato de trabajo es “alrededor de las 22:47 UTC”.

Vehículos: Super Heavy Booster 22 y Ship 42, ambos de la generación V3 (Block 3). Cuarto vuelo de esa generación. Carga: 26 satélites Starlink V3 (misión también citada como Starlink Group 31-2).

**Booster.** Subió con 33 Raptor. Después del hot-staging hizo el flip y reencendió 32 de los 33 motores previstos para el boostback. La quema terminó temprano por una alarma de poca masa de combustible; la causa de raíz seguía en investigación al 14 de noviembre. El GNC abortó la catch durante la costa y desvió el booster a un punto en el Golfo. Hizo la quema de aterrizaje, cortó motores mientras quedaba en hover sobre el agua y, al apagar, se disparó el sistema de terminación de vuelo (FTS). No hubo catch del booster. SpaceX no publicó coordenadas ni distancia exacta del splashdown.

**Ship.** Completó una quema de ascenso nominal, cortó motores, y más tarde encendió un solo Raptor para insertarse en órbita. SpaceX y la transmisión hablaron de una órbita de unos 275 km. Jonathan McDowell reportó una inserción de unos 92 m/s que dejó una órbita casi circular a 276 km. La nave desplegó los 26 Starlink V3 y tuvo contacto con todos. Después de más de 20 horas en el espacio (unas 14 órbitas, unos 22,5 horas desde el despegue), hizo una quema de desórbita con un Raptor de nivel del mar, reentró, hizo un “swoosh” final sobre el Golfo y fue atrapada por los brazos de Mechazilla en el mismo Pad 2. Fue la primera catch de una etapa superior de Starship. Spaceflight Now ubica la catch a las 15:20 CST del 14 de noviembre (21:20 UTC; 18:20 hora de Córdoba).

La línea de tiempo pública de SpaceX dice “All Times Approximate”. Ojo: en esa tabla, T+00:06:35 sigue figurando como “Super Heavy landing burn shutdown and catch”, pero en el vuelo real no hubo catch del booster. Hay que usar esos horarios como referencia pública y mostrar el desenlace real (hover, corte, FTS).

### Línea de tiempo pública (SpaceX, tiempos aproximados)

| T+ (h:min:s) | Evento | Qué usar en la sim |
| --- | --- | --- |
| 00:00:00 | Liftoff | Despegue desde Pad 2 |
| 00:00:58 | Max Q | Solo el instante; no hay altitud oficial |
| 00:02:19 | Super Heavy MECO | Corte de la mayoría de los motores del booster |
| 00:02:21 | Hot-staging | Encendido de la Ship y separación. Space.com estima unos 65 km de altitud |
| 00:02:26 | Inicio del boostback | 32 de 33 motores previstos |
| 00:03:02 | Corte del boostback | Corte anticipado por poca masa de combustible |
| 00:06:10 | Inicio de la quema de aterrizaje del booster | 13 motores, según la cobertura del webcast |
| 00:06:35 | Corte de la quema de aterrizaje | En la realidad: hover sobre el Golfo, corte y FTS. No es catch |
| 00:08:09 | Corte de motores de la Ship (SECO / fin del ascenso) | Costa breve |
| 00:26:10 – 00:26:30 | Quema de inserción orbital | Un solo Raptor, ~20 s (McDowell: ~18 s y ~92 m/s) |
| 00:35:01 – 01:17:40 | Despliegue de carga | 26 Starlink V3, ~42 min |
| 01:27:46 / 07:15:35 / 20:41:55 | Chequeos de regreso (Hawái, Chile, Hawái) | Hitos de costa; la misión siguió |
| 21:35:57 – 21:36:07 | Quema de desórbita | Un Raptor de nivel del mar, ~10 s |
| 22:10:46 | Reentrada | Inicio de la entrada atmosférica |
| 22:29:34 | Transónico | |
| 22:30:13 | Subsónico | |
| 22:32:16 | Inicio de la quema de aterrizaje | Tres Raptor |
| 22:32:18 | Landing flip | |
| 22:32:26 | De 3 a 2 motores | |
| 22:32:33 | De 2 a 1 motor | |
| 22:32:34 | Corte y catch de la Ship | Primera catch de la etapa superior, Pad 2 |

Fuentes de esta sección: [página oficial del Flight 15](https://www.spacex.com/launches/starship-flight-15/), [Space.com (despegue y 275 km)](https://www.space.com/space-exploration/launches-spacecraft/spacex-starship-flight-15-chopsticks-double-catch-super-heavy-ship), [Space.com (65 km en la separación y aborto del booster)](https://www.space.com/space-exploration/launches-spacecraft/relive-starships-historic-flight-15-with-our-best-photos-from-launch-and-mechazilla-tower-catch), [Space.com (alarma de combustible, 13 motores, FTS)](https://www.space.com/space-exploration/launches-spacecraft/spacex-says-starship-flight-15-booster-aborted-chopsticks-landing-catch-after-launch-due-to-guidance-issue-video), [Spaceflight Now](https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/), [actualización V3 de SpaceX, 12 may 2026](https://www.spacex.com/updates). El tuit de McDowell está citado en [Wikipedia: Starship flight 15](https://en.wikipedia.org/wiki/Starship_flight_test_15).

## 3. Alcance

### v1 (esto es el proyecto)

- App web local con Vite, TypeScript y three.js. Sin APIs pagas, sin claves, sin backend.
- Archivo `data/flight15.json` con parámetros, eventos y fuente de cada número.
- Escena a escala: Tierra, zona de Starbase, Pad 2, una torre aproximada, booster y nave con las medidas oficiales (diámetro 9 m; alturas 72 m / 52 m / 124 m de stack).
- El Super Heavy V3 tiene **tres** grid fins, no cuatro (lo dijo SpaceX en la actualización V3).
- Reloj de misión, barra para scrubbing, registro de eventos y HUD: altitud, velocidad, distancia downrange, masa si está modelada, evento actual y si el valor es oficial, estimado o interpolado.
- Cámaras: seguimiento del booster, de la Ship, torre/pad, libre y vista orbital/mapa.
- Física híbrida (ver sección 5): integración de trayectoria, contrastada y, si hace falta, guiada por la línea de tiempo pública.
- El booster se desvía al Golfo, hace hover y FTS. La Ship hace la catch. No mostrar una doble catch que no ocurrió.
- La costa de ~22 h se comprime (control de velocidad 1×, 10×, 100×, “saltar al próximo evento”).
- Disclaimer visible en la UI.
- Pruebas automatizadas de carga de datos y de tolerancia contra la línea de tiempo.
- Panel breve de fuentes.

### Queda para después (no es v1)

- Aero de alta fidelidad, actitud 6 DoF completa, plasma/ablación, audio del webcast, modelos 3D fotorealistas, coordenadas exactas del FTS si algún día se publican, superponer telemetría de aficionados como si fuera oficial, multiplayer, ni app nativa.

## 4. Stack técnico

- Vite + TypeScript + three.js.
- Tests con Vitest (o el runner que ya traiga Vite).
- Datos solo en archivos locales (`data/flight15.json`). Nada de OpenAI, mapas pagos ni tokens.
- Modelos 3D simples (primitivas o glTF liviano hecho en el repo). Si se usa un modelo de terceros, tiene que ser de licencia libre y estar acreditado.
- Tierra: esfera texturizada con un mapa de dominio público o una representación simple. No hace falta un globo comercial.
- README en español, claro, con el aviso, cómo correr el proyecto y de dónde salen los datos.

## 5. Cómo simular (recomendación: híbrido)

Hay tres caminos. El recomendado para v1 es el C.

**A. Solo replay.** Interpolás una trayectoria que pase por los eventos públicos. Es prolijo y predecible, pero no pone a prueba la física ni al modelo.

**B. Física pura.** Masa puntual, gravedad, arrastre y empuje. Choca con un problema de fondo: SpaceX no publica masas secas, ni Cd, ni la altitud/velocidad de casi ningún evento. Una física “pura” con números inventados miente.

**C. Híbrido (recomendado).** Integrás la trayectoria en 3D (se puede arrancar en el plano del lanzamiento y después pasar a ECEF o ECI simple):

- Gravedad inversamente proporcional al cuadrado. Usá la constante gravitacional de la Tierra de WGS 84 (μ = 3,986004418 × 10¹⁴ m³/s²). Fuente: [NIMA TR8350.2 / WGS 84](https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84).
- Atmósfera: [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/citations/19770009539) para densidad vs altitud. Cd inicial constante, declarado como estimación, ajustable.
- Empuje y consumo de masa: `ṁ = F / (Isp × g0)`, con el empuje oficial y un Isp etiquetado como estimación si no hay cifra oficial vigente.
- Eventos de la línea de tiempo (encendido, corte, separación, desvío, FTS, catch) disparan cambios de fase a los T+ públicos.
- Si la física se desvía —va a pasar, porque faltan masas y aero—, una capa de guía apunta al próximo evento público (tiempo y, si existe, altitud). El residual se registra. El HUD no puede disfrazar un valor guiado o interpolado como telemetría real.
- El aborto del booster no es opcional: el boostback se corta en T+00:03:02, el vehículo se desvía costa afuera (rumbo este/sureste sobre el Golfo, sin inventar kilómetros) y termina en hover + FTS.

Integrador: Runge–Kutta 4 o un semi-implícito estable, paso de 0,05–0,1 s en las quemas y más holgado en la costa orbital. Determinista: misma semilla, misma corrida.

## 6. Formato de datos: `data/flight15.json`

Cada magnitud numérica lleva `value`, `unit`, `confidence` (`official`, `reported`, `estimate`, `unknown`) y `source` (URL o “no publicado”). Si `confidence` es `unknown`, `value` va `null`. Está prohibido rellenar un null con un número “que parezca razonable” sin etiquetarlo como estimación y sin dejar constancia en el README.

Estructura mínima:

```json
{
  "meta": {
    "disclaimer": "Aproximación con datos públicos. No es información oficial de vuelo.",
    "researched_at": "2026-11-19",
    "timezone_note": "T+ es tiempo de misión. El despegue local fue en America/Chicago (CST, UTC−6)."
  },
  "mission": { },
  "site": { },
  "vehicle": {
    "stack": { },
    "booster": { },
    "ship": { },
    "raptor": { }
  },
  "timeline": [
    {
      "id": "liftoff",
      "t_sec": 0,
      "label": "Liftoff",
      "confidence": "official",
      "source": "https://www.spacex.com/launches/starship-flight-15/",
      "as_flown_note": null
    }
  ],
  "physics_estimates": {
    "comment": "Solo parámetros no publicados. Se pueden ajustar. Nunca se presentan como oficiales."
  }
}
```

Valores de partida (oficiales, salvo que se indique otra cosa):

| Magnitud | Valor | Confianza | Fuente |
| --- | ---: | --- | --- |
| Altura del stack | 124 m | official | [SpaceX Starship](https://www.spacex.com/vehicles/starship) |
| Diámetro | 9 m | official | idem |
| Ship: altura, propelente, empuje | 52 m; 1.600 t; 1.614 tf | official | idem |
| Super Heavy: altura, propelente, empuje | 72 m; 3.650 t; 8.240 tf | official | idem |
| Motores | Booster 33 Raptor (13 centrales maniobrables, 20 en el perímetro); Ship 3 Raptor + 3 RVac | official | idem |
| Raptor (página del vehículo): diámetro, altura, empuje | 1,3 m; 2,9 m; 250 tf | official | idem |
| Raptor 3 SL / vacío / masa del motor SL | 250 tf; 275 tf; 1.525 kg | official | [Actualización V3, 12 may 2026](https://www.spacex.com/updates) |
| Pad | Orbital Launch Pad 2, Starbase, Texas | official | [Flight 15](https://www.spacex.com/launches/starship-flight-15/) |
| Coordenadas del pad | 25,99677° N, 97,15799° W | reported | [Launch Library 2, pad 235](https://ll.thespacedevs.com/2.2.0/pad/235/) — base de datos de terceros, suficiente para v1 |
| Órbita | ~275 km | reported | SpaceX / transmisión; McDowell: casi circular a 276 km |
| Altitud de separación | ~65 km | reported | Space.com, cifra aproximada |
| Masa seca del booster y de la Ship | no publicada | unknown | SpaceX no la da en la ficha actual |
| Isp | no está en la ficha actual | estimate / unknown | Un tuit de SpaceX del 3 ago 2024 citó 350 s para la variante de nivel del mar; hay que tratarlo como dato viejo y discutido (¿Isp de vacío del motor SL?). Ajustable |
| Cd, área de referencia, masa de cada Starlink V3, coordenadas del FTS, altitud de Max Q, velocidad de separación | no publicados | unknown | Dejar null o estimar con etiqueta |

Inconsistencia a no “arreglar”: 3 × 250 tf + 3 × 275 tf = 1.575 tf, pero la ficha del vehículo dice 1.614 tf para la Ship. En el JSON van las dos cifras, cada una con su fuente. No se promedia en silencio.

Capacidad de propelente es un techo de diseño, no la carga real del Flight 15 (no publicada). La sim puede partir de esos techos y bajar masa en el ajuste, dejándolo asentado.

Hay un archivo de partida en `data/flight15.json`. Se puede completar, no se pueden promover estimaciones a oficiales.

## 7. Visualización

- Tierra y la costa de Texas / el Golfo, con Pad 2 y una torre de captura. La altura exacta de la torre no está en la ficha de SpaceX: usar una torre reconocible, a escala razonable, y no afirmar un metro exacto.
- Vehículos a escala, con 33 motores en el booster y 6 en la Ship. Tres grid fins en el V3. Plumas de escape simples según la cantidad de motores encendidos (33, 32, 13, 6, 3, 2, 1).
- El FTS del booster se ve como pérdida del vehículo sobre el agua, no como aterrizaje suave ni como catch.
- La Ship, al volver: aproximación desde el este de Texas, swoosh sobre el Golfo, flip, quema 3–2–1 y cierre de brazos.
- HUD y scrubber siempre visibles. Al pausar, se puede saltar de evento a evento.
- Un badge por dato: Oficial / Reportado / Estimado / Interpolado.

### 7.1 Interacción y órbita (pedido de Cristian)

- **Cámara manejable**: orbitar, zoom y paneo libres con el mouse, además de los modos de seguimiento (booster, Ship, torre/pad, Tierra entera y vista orbital). Transiciones suaves entre modos.
- **Control de tiempo**: play, pausa, velocidades 1×, 10×, 100× y 1000×, scrubber para ir a cualquier momento y botones para saltar al evento anterior o al siguiente.
- **Misión completa de punta a punta**: despegue, ascenso, hot-staging, regreso del booster como ocurrió, inserción orbital de la Ship, despliegue de los 26 Starlink V3 (cada satélite se separa y sigue su propia órbita, con su número), chequeos en órbita, quema de desórbita, reentrada y catch.
- **Órbita en vivo**: dibujar la órbita osculante actual de la Ship (la elipse alrededor de la Tierra) calculada desde el vector de estado (r, v) en cada cuadro. Marcar el perigeo y el apogeo con sus valores. Durante una quema, la elipse y los valores tienen que cambiar en vivo. Trayectorias suborbitales: mostrar el arco y avisar que el perigeo está bajo la superficie. Mostrar la traza en tierra (ground track) como opción.
- **Maniobras**: cada encendido (inserción, desórbita, etc.) aparece en la línea de tiempo con su Δv estimado y su fuente, y se ve en la escena (pluma y cambio de órbita).
- **Panel de telemetría siempre visible**: T+, fase o evento actual, altitud, velocidad relativa a la superficie e inercial, downrange, aceleración en g, masa o propelente estimado, motores encendidos, perigeo, apogeo, inclinación, período orbital, excentricidad y latitud y longitud. Cada valor lleva su badge (Oficial / Reportado / Estimado / Calculado).
- **Realismo**: Tierra en rotación (WGS 84), coordenadas reales de Pad 2 en Starbase y escala real, con una opción de escala visual para los vehículos cuando se ve la Tierra entera. Los elementos orbitales se calculan del estado (no se dibujan a mano).
- Check: durante la quema de inserción el perigeo sube de valor negativo o suborbital hasta unos 275 km ± 15 km; durante la desórbita el perigeo baja dentro de la atmósfera; los 26 Starlink se separan en la ventana del despliegue; se puede recorrer todo con mouse y teclado sin abrir la consola.

## 8. Criterios de validación

La línea de tiempo de SpaceX es aproximada, así que las tolerancias miden coherencia con lo público, no precisión de vuelo.

| Fase | Qué comparar | Tolerancia v1 |
| --- | --- | --- |
| T+0 a SECO (0–8 min) | Instante de cada evento oficial | ± 2 s |
| Inserción y despliegue | Instante de inicio/fin | ± 5 s |
| Chequeos de costa y desórbita | Instante | ± 15 s |
| Reentrada hasta catch | Instante de cada evento oficial | ± 5 s |
| Altitud de separación | Si se usa el valor reportado de ~65 km | ± 10 km |
| Altitud después de la inserción | ~275 km | ± 15 km |
| Desenlace | Booster: desvío + hover + FTS, sin catch. Ship: catch en Pad 2 | Cualitativo, obligatorio |
| Honestidad de datos | Ningún valor `unknown` aparece como oficial en el HUD | Test o checklist |

Si para entrar en tolerancia hay que guiar la trayectoria, el informe de validación lo dice y muestra el residual.

## 9. Etapas (chicas y verificables)

El orquestador reparte cada etapa al implementador. No se pasa a la siguiente sin los checks de la actual y, en las etapas de física y desenlace, sin una pasada de revisión (Oracle).

### Etapa 0 — Andamiaje

App Vite + TS + three.js que abre un canvas, un README con el aviso y `npm test` andando. Check: `npm run dev` muestra la escena vacía y el disclaimer.

### Etapa 1 — Datos

`data/flight15.json` tipado, loader, tests: cada número tiene fuente; los `unknown` son null; la timeline tiene los eventos de la sección 2, con la nota de “no fue catch” en T+00:06:35. Check: los tests de datos pasan.

### Etapa 2 — Escena estática a escala

Tierra, pad, torre, stack en T=0. Medidas oficiales. Tres grid fins. Check: una captura o un test de cotas (diámetro 9 m, alturas 72/52/124 m).

### Etapa 3 — Reloj, scrubber y HUD

Reloj de misión, scrubber, log de eventos y HUD sobre una trayectoria placeholder (aunque sea una curva de placeholder). Check: al mover el scrubber cambian el T+ y el evento; el placeholder está etiquetado como tal.

### Etapa 4 — Física de ascenso

Integrador + gravedad + atmósfera + empuje hasta MECO y hot-staging. Check: los tiempos de Max Q (si se modela el instante), MECO y staging caen en ± 2 s; la altitud de staging, si se valida contra los 65 km reportados, cae en ± 10 km; el informe lista las estimaciones usadas.

### Etapa 5 — Booster, como voló

Flip, boostback con 32 motores, corte anticipado, desvío al Golfo, quema de 13 motores, hover, FTS. Check: no hay catch del booster; T+ de boostback y quema de aterrizaje en ± 2 s; el vehículo no vuelve a la torre.

### Etapa 6 — Ship, como voló

Ascenso a SECO, inserción, costa comprimida con los tres chequeos, desórbita, reentrada, transónico/subsónico, flip, quema 3–2–1, catch en Pad 2. Check: tiempos en tolerancia; altitud post-inserción ~275 km ± 15 km; la catch ocurre en la torre, no en el agua.

### Etapa 7 — Informe de validación

Página o Markdown generado con sim vs línea de tiempo, residuales y lista de estimaciones. Check: todos los eventos de la tabla tienen una fila.

### Etapa 7.5 — Órbita, Starlink y telemetría

Todo lo de la sección 7.1: elipse osculante en vivo con perigeo y apogeo, maniobras, despliegue de los 26 Starlink, panel completo y control de tiempo. Check: los de la sección 7.1.

### Etapa 8 — Pulido

Cámaras de la sección 7, control de velocidad, panel de fuentes, swoosh reconocible, UI usable en un laptop. Check: se puede recorrer el vuelo entero sin abrir la consola.

## 10. Evaluación del preset (qué anotar)

Además del simulador, este trabajo es una corrida de prueba del preset oh-my-opencode-slim: GPT-6.2 Astra como orquestador y en las puertas de revisión Oracle, y GPT-6.2 Sol como implementador/fixer. Esos nombres son para la nota de evaluación. No hay que clavar IDs de modelo en el código, en el plan que se le pega a OpenCode ni en los commits: ahí se habla de roles.

Al cerrar cada etapa, y al final del proyecto, Cristian o el orquestador dejan una nota (en el README o en `NOTES-EVAL.md`) con:

- **Rol:** orquestador, revisores Oracle, o implementador/fixer.
- **Modelo o alias usado en esa corrida** (el que muestre OpenCode; no hardcodearlo en el repo).
- **Qué hizo:** plan, implementación, corrección, revisión.
- **Etapa** (0 a 8).
- **Tiempo:** inicio y fin en hora de Córdoba, y duración aproximada.
- **Cuota o costo visible:** si OpenCode o el proveedor muestran tokens, porcentaje de cuota o un aviso de límite, copiarlo. Si no se ve nada, escribir “no visible”.
- **Calidad, en concreto:**
  - ¿Leyó el spec antes de codear?
  - ¿Inventó algún número? ¿Cuál?
  - ¿Los tests de la etapa pasaron en el primer intento?
  - ¿La revisión Oracle encontró algo de fondo o solo detalle?
  - ¿El implementador respetó el alcance de v1?
  - Nota 1–5 y una frase de por qué.

Esa nota es evidencia para el stack. No se cambia ningún preset con este documento.

## 11. Riesgos

- Sin masa seca ni Cd, la física pura no cierra. Por eso el híbrido y las etiquetas de honestidad.
- La tabla oficial todavía dice “catch” en el booster. Si se implementa literal, el sim miente.
- Un vuelo de 22,5 h no se puede renderizar en tiempo real a 1× todo el rato: hay que comprimir la costa.
- El orquestador puede querer escribir código o saltear etapas. El prompt le pide delegar e ir etapa por etapa.
- Una corrida larga puede gastar cuota. Conviene cortar por etapa y guardar el informe aunque quede a medias.
- Coordenadas de Launch Library 2 son de terceros. Sirven para v1; no son un relevamiento oficial de SpaceX.

## 12. Fuentes

| Fuente | Para qué |
| --- | --- |
| [SpaceX: Starship Flight 15](https://www.spacex.com/launches/starship-flight-15/) | Relato oficial, desenlace, countdown y timeline (tiempos aproximados) |
| [SpaceX: vehículo Starship](https://www.spacex.com/vehicles/starship) | Alturas, diámetro, propelente, empujes, recuento de motores, Raptor 250 tf |
| [SpaceX Updates (V3, 12 may 2026)](https://www.spacex.com/updates) | Raptor 3: 250 / 275 tf, masa 1.525 kg; Super Heavy V3 con 3 grid fins; Pad 2 |
| [Space.com: despegue y órbita](https://www.space.com/space-exploration/launches-spacecraft/spacex-starship-flight-15-chopsticks-double-catch-super-heavy-ship) | ~16:47 CST, ~275 km, inserción ~20 s, 26 Starlink, ~14 órbitas |
| [Space.com: fotos y ~65 km](https://www.space.com/space-exploration/launches-spacecraft/relive-starships-historic-flight-15-with-our-best-photos-from-launch-and-mechazilla-tower-catch) | Altitud aproximada en la separación |
| [Space.com: aborto del booster](https://www.space.com/space-exploration/launches-spacecraft/spacex-says-starship-flight-15-booster-aborted-chopsticks-landing-catch-after-launch-due-to-guidance-issue-video) | Alarma de combustible, aclaración del GNC, 13 motores, hover y FTS |
| [Spaceflight Now, cobertura en vivo](https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/) | 16:47 CST, catch ~15:20 CST, B22 / S42, reentrada sobre el Pacífico y el suroeste |
| [Wikipedia: Starship flight 15](https://en.wikipedia.org/wiki/Starship_flight_test_15) | Recuento con citas; usar siempre la fuente original, no la wiki sola |
| [Launch Library 2, pad 235](https://ll.thespacedevs.com/2.2.0/pad/235/) | Coordenadas aproximadas de Pad 2 |
| [WGS 84](https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84) | μ de la Tierra |
| [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/citations/19770009539) | Densidad vs altitud |
| [FAA: licencia VOL 23-129](https://www.faa.gov/space/stakeholder_engagement/spacex_starship) | Contexto regulatorio; la Rev. 10 autorizó el Flight 15. La PEA de 2022 describe un diseño más viejo (no usar esas masas como si fueran las de V3) |

El detalle crudo, las citas y los huecos están en `research.md`.
