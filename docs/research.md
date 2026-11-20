# Notas crudas de investigación — Starship Flight 15

Fecha de la pesquisa: 19 de noviembre de 2026, hora de Córdoba (UTC−3).  
Regla usada: no inventar números. Si un dato no aparece en una fuente, se anota como hueco.

El Flight 15 **ya voló** (13–14 de noviembre de 2026). No hace falta basar la sim en un plan previo ni en un vuelo anterior. Lo que sigue es el vuelo tal como lo describen fuentes públicas.

## 1. Fuentes primarias y de prensa, en orden

1. SpaceX, página de la misión: https://www.spacex.com/launches/starship-flight-15/  
   Consultado el 19-11-2026. Relato post-vuelo, countdown y “FLIGHT TIMELINE / All Times Approximate”.
2. SpaceX, ficha del vehículo: https://www.spacex.com/vehicles/starship  
   También: https://www.spacex.com/vehicles/starship/technical-specifications (mismo contenido al consultarla).
3. SpaceX Updates, “Introducing Starship V3”, 12 de mayo de 2026: https://www.spacex.com/updates  
   El texto está en esa página de actualizaciones (entrada del 12 may 2026). Incluye empujes de Raptor 3, masa del motor y los tres grid fins del Super Heavy V3.
4. Space.com, Josh Dinner, 13 nov 2026: https://www.space.com/space-exploration/launches-spacecraft/spacex-starship-flight-15-chopsticks-double-catch-super-heavy-ship  
   Despegue, órbita ~275 km, inserción, carga útil.
5. Space.com, fotos y separación: https://www.space.com/space-exploration/launches-spacecraft/relive-starships-historic-flight-15-with-our-best-photos-from-launch-and-mechazilla-tower-catch  
   “Starship soared approximately 40 miles (65 km) overhead” en la separación.
6. Space.com, Tariq Malik, actualizado 14 nov 2026: https://www.space.com/space-exploration/launches-spacecraft/spacex-says-starship-flight-15-booster-aborted-chopsticks-landing-catch-after-launch-due-to-guidance-issue-video  
   Alarma de combustible, aclaración de Huot sobre el GNC, 13 motores, hover, FTS.
7. Spaceflight Now, cobertura: https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/  
   Horarios locales, B22 / S42, catch ~15:20 CST, reentrada.
8. Wikipedia, Starship flight 15: https://en.wikipedia.org/wiki/Starship_flight_test_15  
   Útil como índice de citas. No usar un número de la wiki si la nota al pie no lo sostiene.
9. Launch Library 2, pad 235: https://ll.thespacedevs.com/2.2.0/pad/235/  
   Coordenadas de Pad 2 (terceros).
10. WGS 84: https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84
11. U.S. Standard Atmosphere 1976 (NASA NTRS): https://ntrs.nasa.gov/citations/19770009539
12. FAA, contexto Starship/Starbase: https://www.faa.gov/space/stakeholder_engagement/spacex_starship  
    Licencia citada en prensa: VOL 23-129 Rev. 10, 13 nov 2026, un solo Flight 15 más reentrada. No se descargó el PDF de la Rev. 10 en esta pesquisa.
13. PEA de la FAA, 2022 (diseño viejo, no V3): https://www.faa.gov/sites/faa.gov/files/2022-06/PEA_for_SpaceX_Starship_Super_Heavy_at_Boca_Chica_FINAL.pdf

Otras notas de prensa que coinciden en lo sustancial, usadas como cruce, no como fuente de números nuevos:

- CNBC (catch de la Ship, booster al Golfo): https://www.cnbc.com/2026/11/14/spacex-plans-to-try-first-ever-catch-of-starship-rocket-from-orbit.html
- CNBC (despegue): https://www.cnbc.com/2026/11/13/spacex-launches-starship-in-key-test-flight-of-massive-rocket.html
- The Register: https://www.theregister.com/science/2026/11/16/spacex-catches-starship-on-the-first-try/5310059
- The Space Road (recuento): https://thespaceroad.com/articles/starship-flight-15-recap/
- Seeking Alpha (licencia FAA Rev. 10): https://seekingalpha.com/news/4672602-faa-revises-spacex-starship-license-authorizes-single-flight-15-launch

No se usó como fuente de verdad la telemetría de aficionados (p. ej. https://telemetry.starshipspaceprogram.com/), ni wikis no oficiales, ni Reddit, para fijar números de v1.

## 2. El vuelo, con citas

### Fecha, sitio, vehículos

SpaceX: “On Friday, November 13, Starship lifted off from Starbase, Texas on its 15th flight. And on Saturday, November 14, Starship returned to Starbase, Texas… Flight 15 started with the Super Heavy booster ascending away from Pad 2 at Starbase under the power of 33 Raptor engines.”

Spaceflight Now y Space.com identifican Booster 22 y Ship 42. Spaceflight Now: despegue “at 4:47 p.m. CST (5:47 p.m. EST / 2247 UTC) on Friday, Nov. 13”. Una epígrafe de la misma nota dice “4:48 p.m. CST”. Space.com (Dinner, desde Starbase): “5:47 p.m. ET (2247 GMT; 4:47 p.m. local Texas time)”.

SpaceX no publica el segundo exacto en la página de la misión.

Wikipedia da “November 13, 2026, 22:47:36 UTC (4:47:36 pm CST)” con notas [1] y [2]. La [2] es la página de SpaceX (sin ese segundo). La [1] es un documento CADENA de planificación del 8 de octubre de 2026, anterior al vuelo. **No tratar 22:47:36 UTC como cifra oficial.** Dato de trabajo: alrededor de las 22:47 UTC (16:47 CST; 19:47 hora de Córdoba).

Catch de la Ship: Spaceflight Now “at 3:20 p.m. CST (2120 UTC)”. SpaceX dice que volvió al mismo sitio “22.5 hours prior” y la tabla oficial pone la catch a T+22:32:34 (tiempos aproximados). Wikipedia arma 22 h 32 min 32 s y 21:20:08 UTC; esa aritmética depende de adoptar 22:47:36 UTC como despegue, así que no se copia como oficial.

Ventana: prensa y recuentos coinciden en que abrió a las 16:45 CST. No es un dato necesario para la sim.

Generación: cuarto vuelo V3 / Block 3. El V3 debutó en el Flight 12 (22 may 2026, Pad 2), según https://www.spacex.com/launches/starship-flight-12/.

Nombre de la carga: Wikipedia y bases de lanzamiento citan “Starlink Group 31-2”. SpaceX habla de “26 Starlink V3 satellites” sin ese nombre de grupo en el texto consultado.

### Booster, como voló

SpaceX, texto post-vuelo (cita casi textual):

> The booster performed its directional flip maneuver and relit 32 of the planned 33 Raptor engines for the boostback burn. The boostback burn ended early due to low fuel mass, with the root cause under investigation. The booster’s guidance, navigation and control triggered an automated abort during coast and diverted itself successfully to an offshore landing location. It successfully executed a landing burn with the engines cutting off while hovering over the Gulf. Upon landing burn shutdown, the Super Heavy’s flight termination system was triggered.

Aclaración de Dan Huot (Space.com y Spaceflight Now), ~16,5 h into the mission: no fue “un fallo de GNC”. El GNC detectó que el booster no estaba donde tenía que estar para la catch, abortó y se fue al punto de contingencia en el Golfo. Kate Tice, 14 nov, webcast: “Early indications are that the booster ended its boostback [burn] early due to a low fuel mass alarm.”

Space.com (Malik): “activating 13 of its Raptor engines as planned”, hover, corte, FTS, “exploded a few feet above the waves… about 6.5 minutes after liftoff.”

No apareció una distancia en km ni un lat/lon del splashdown en las fuentes oficiales ni en la prensa citada. Hueco.

La tabla de SpaceX, en T+00:06:35, todavía dice “Super Heavy landing burn shutdown and catch”. Ese rótulo no describe el vuelo real. Los horarios de inicio/corte de la quema (00:06:10 / 00:06:35) pueden ser los del plan aproximado; se usan como referencia pública, con la nota de desenlace real.

### Ship, como voló

SpaceX: quema de ascenso nominal, costa breve, “reigniting a single Raptor engine for an orbital insertion burn”. Después, 26 Starlink V3, “contact was made soon after with every satellite”. Costa larga, “more than 20 hours in space”. Desórbita: “successfully relit a single Raptor sea-level engine”. Regreso: “navigated its way back to the east coast of Texas, flew a final swoosh maneuver out over the Gulf… 22.5 hours prior. After breaking through the clouds, three Raptor engines ignited for a landing flip and slow descent into Mechazilla’s waiting arms, which closed to catch Starship for the very first time.”

Space.com (Dinner), citando a Huot: “nominal orbit insertion… around 170 miles (275 kilometers) at T+26 minutes and 10 seconds.” Inserción “lasting about 20 seconds”. Despliegue “over a 42-minute span starting 35 minutes after launch.” Tres de los V3 llevaban cámaras para el escudo térmico. Chequeos de contingencia para un regreso temprano al Pacífico: ~10 min después del deploy, T+7 h 15 min, T+20 h 41 min (coinciden con la tabla de SpaceX: Hawái / Chile / Hawái). Desórbita prevista “10-second… at approximately T+21 hours and 36 minutes”. También había zona de contingencia en el Golfo para la Ship si no se podía hacer la catch.

Spaceflight Now: reentrada “over the Pacific Ocean and made a supersonic flight across Mexico and the South West United States before turning out over the ocean” hacia Pad 2. “14 orbits.”

Jonathan McDowell (@planet4589), 14 nov 2026, citado por Wikipedia nota [3]: “Ship reached initial orbit at T+8:10, single-engine 18s insertion burn at T+26:06 of about 92 m/s raised perigee to near-circular orbit at 276 km.” No se abrió el tuit original en esta pesquisa; se registra vía la cita de Wikipedia. La tabla de SpaceX pone inserción 00:26:10–00:26:30 (20 s). Hay un desfase de unos segundos y de 18 vs 20 s: ambos son aproximados. Usar la tabla de SpaceX como reloj público y anotar los 92 m/s / 276 km de McDowell como dato reportado.

Wikipedia lista periapsis 276 km, apoapsis 278 km e inclinación 30,5°. Solo el periapsis tiene la nota [3]. **No tratar 278 km ni 30,5° como bien citados.** El dato más seguro es “órbita baja de unos 275–276 km, casi circular”.

## 3. Línea de tiempo oficial (copia de trabajo)

Fuente: https://www.spacex.com/launches/starship-flight-15/ — “All Times Approximate”.

Countdown (no hace falta animarlo en v1, queda como contexto): T−50:00 GO for prop load; T−35:33 / 35:30 LOX y CH4 del booster; T−35:12 / 35:11 LOX y CH4 de la Ship; T−21:40 engine chill; T−02:50 / 02:10 fin de carga; T−00:30 GO for launch; T−00:17 flame diverter; T−00:03 startup; T−00:00 “Excitement guaranteed”.

Vuelo:

| T+ | Evento, texto de SpaceX |
| --- | --- |
| 00:00:00 | Liftoff |
| 00:00:58 | Max Q (moment of peak aerodynamic stress on the rocket) |
| 00:02:19 | Super Heavy MECO (most engines cut off) |
| 00:02:21 | Hot-staging (Starship Raptor ignition and stage separation) |
| 00:02:26 | Super Heavy boostback burn start |
| 00:03:02 | Super Heavy boostback burn shutdown |
| 00:06:10 | Super Heavy landing burn start |
| 00:06:35 | Super Heavy landing burn shutdown and catch  ← rótulo no coincide con el vuelo |
| 00:08:09 | Starship engine cutoff |
| 00:26:10 | Starship orbital insertion burn start |
| 00:26:30 | Starship orbital insertion burn shutdown |
| 00:35:01 | Payload deploy start |
| 01:17:40 | Payload deploy complete |
| 01:27:46 | Early Hawaii Return Check |
| 07:15:35 | Mid Chile Return Check |
| 20:41:55 | Final Hawaii Return Check |
| 21:35:57 | Deorbit burn start |
| 21:36:07 | Deorbit burn shutdown |
| 22:10:46 | Starship entry |
| 22:29:34 | Starship is transonic |
| 22:30:13 | Starship is subsonic |
| 22:32:16 | Landing burn start |
| 22:32:18 | Landing flip |
| 22:32:26 | Landing burn 3 to 2 engines |
| 22:32:33 | Landing burn 2 to 1 engine |
| 22:32:34 | Starship landing burn shutdown and catch |

Duración de quemas que se pueden calcular de esa tabla (aproximadas): boostback 36 s (02:26–03:02); landing burn booster 25 s (06:10–06:35); inserción 20 s; desórbita 10 s; quema de aterrizaje de la Ship 18 s (22:32:16–22:32:34).

## 4. Parámetros del vehículo

### Oficiales, ficha de SpaceX (consultada 19-11-2026)

https://www.spacex.com/vehicles/starship

- Stack: 124 m / 407 ft de altura; 9 m / 29,5 ft de diámetro; payload “100+ t”.
- Starship (etapa superior): 52 m / 171 ft; 9 m; propelente 1.600 t / 3,5 Mlb; empuje 1.614 tf / 3,5 Mlbf; payload 100+ t.
- Super Heavy: 72 m / 236 ft; 9 m; propelente 3.650 t / 8 Mlb; empuje 8.240 tf / 18,1 Mlbf; 33 Raptor; metano y oxígeno líquido subenfriados; “13 maneuverable engines in the center and the remaining 20 around the perimeter”.
- Ship: “six engines, three Raptor engines, and three Raptor Vacuum (RVac) engines”.
- Raptor (bloque de la ficha, un solo juego de cifras): diámetro 1,3 m / 4,2 ft; altura 2,9 m / 9,5 ft; empuje 250 tf / 551 klbf.
- La ficha **no publica** masa seca, masa de despegue, Isp, área de referencia ni Cd.

Chequeo interno, no “corregir”: 33 × 250 tf = 8.250 tf, la ficha del booster dice 8.240 tf. 3 × 250 + 3 × 275 = 1.575 tf, la ficha de la Ship dice 1.614 tf. Dejar ambas cifras con su fuente.

### Oficiales, actualización V3 (12 may 2026)

https://www.spacex.com/updates — “Introducing Starship V3”

- “Raptor 3 engines deliver increased thrust, with sea-level variants now producing 250 tf (551,000 lbf) up from 230 tf (507,000 lbf), while vacuum engines produce 275 tf (606,000 lbf) up from 258 tf (568,000 lbf).”
- “Mass of the Raptor sea-level engines has been reduced to 1,525 kg from 1,630 kg. Overall vehicle-level mass savings reach approximately 1 ton per engine…”
- Super Heavy V3: **tres** grid fins (antes cuatro), 50 % más grandes, relojadas para la catch, más bajas por el calor del hot-staging; hot stage integrado (ya no interstage descartable); 33 motores; protección en los 13 centrales (TVC); dos quick disconnects.
- Starship V3: tanques más grandes, PEZ dispenser mejorado, sistemas para vuelos largos, cuatro drogues de docking a sotavento, etc.
- Flight 12 = primer vuelo desde Pad 2.

Esto importa para el modelo 3D: tres aletas, no cuatro.

### Isp

La ficha actual de SpaceX no da Isp. Un tuit de @SpaceX del 3 de agosto de 2024 (ampliamente citado; no se reabrió el tuit en esta pesquisa) presentaba Raptor 3 “sea level variant” con “Specific impulse: 350s” y “Engine mass: 1525kg”, entonces con empuje 280 tf (cifra de 2024, después actualizada a 250 tf en mayo 2026). Varios recuentos (p. ej. artículos que citan a Dan Huot) dicen que esos 350 s eran el Isp de vacío del motor de nivel del mar, no el Isp al nivel del mar. Wikipedia (Super Heavy Block 3) pone SL 330 s / vac 350 s; no se verificó una fuente primaria sólida para los 330 s. **Tratar cualquier Isp como estimación ajustable.** Cifras viejas de 2018–2019 (327 s SL / 350–380 s vac) son de otra generación; no usarlas como si fueran Raptor 3 de 2026.

### Masas secas y masa de despegue

SpaceX no publica masa seca del Super Heavy V3 ni de la Ship V3 en la ficha actual.

Wikipedia lista 275 t vacías para Super Heavy en el bloque de Block 1/2, no en el de Block 3. No copiar eso como masa de B22.

La PEA de la FAA de junio 2022 habla de un diseño anterior (menciona hasta ~3.700 t de propelente y una masa máxima de despegue de ~5.000 t, y en ese texto aún aparecen 37 motores). **No usar esos números como si fueran el Flight 15 / V3.** Solo documentan un sobre de diseño viejo.

En esta pesquisa aparecieron estimaciones de terceros (análisis post Flight 12, blogs) con masas secas del orden de ~250 t el booster y ~170 t la nave. No se adoptaron: no son oficiales, no se abrió el trabajo original con método reproducible, y para v1 es más honesto dejar `unknown` y ajustar.

Masa de los 26 Starlink V3: no está en la página del Flight 15. Circulan cifras de ~2.000–2.500 kg por satélite ligadas a trámites FCC de “Gen3”; no se verificó el PDF primario ni que “Gen3” sea exactamente el V3 de este vuelo. **Hueco.** Si más adelante se cita un FCC filing, se puede cargar como `reported`.

Propelente 3.650 t / 1.600 t: capacidad de diseño, no necesariamente la carga del 13-11. La partición LOX/CH4 (Wikipedia, a partir de una relación de mezcla) no se tomó como oficial.

### Sitio

Pad 2, Starbase, Texas. Launch Library 2, GET https://ll.thespacedevs.com/2.2.0/pad/235/ : `"latitude": "25.99677", "longitude": "-97.15799"`, nombre “Orbital Launch Pad 2”, mount “Orbital Launch Mount B”, timezone America/Chicago. Es una base de datos de terceros. Suficiente para colocar la escena; no es un plano oficial.

Altura de la torre / Mechazilla: SpaceX no da un metro exacto en la ficha (“two of the tallest launch towers in the world”). Cifras tipo 144,5 m aparecen en wikis no oficiales. **No fijar una altura oficial.** En v1, torre reconocible a escala razonable, sin afirmar el metro.

### Atmósfera y gravedad (modelos públicos, no del vuelo)

- WGS 84, μ = 3,986004418 × 10¹⁴ m³/s². https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84
- U.S. Standard Atmosphere 1976. https://ntrs.nasa.gov/citations/19770009539
- g0 convencional para Isp: 9,80665 m/s² (estándar, no es un dato de SpaceX).

## 5. Qué no apareció (huecos que importan al sim)

1. Masas secas (y masa real de despegue) de B22 y S42.
2. Isp oficial vigente de Raptor 3 SL y RVac, al nivel del mar y en vacío.
3. Cd, área de referencia y cualquier coeficiente aerodinámico.
4. Altitud y velocidad de Max Q (solo está el tiempo, T+58 s).
5. Velocidad en la separación. Altitud solo aproximada por Space.com (~65 km).
6. Coordenadas o distancia del splashdown / FTS del booster.
7. Carga real de propelente en este vuelo (vs capacidad).
8. Masa de cada Starlink V3 y por lo tanto de la carga.
9. Segundo exacto del despegue, publicado por SpaceX.
10. Apoapsis 278 km e inclinación 30,5° sin cita sólida.
11. Altura oficial de la torre y altura de catch.
12. Telemetría oficial de altitud/velocidad vs tiempo (el webcast puede haber mostrado overlays; no se transcribió un perfil numérico oficial en esta pesquisa).
13. Texto completo de la licencia FAA VOL 23-129 Rev. 10 (solo se confirmó su existencia por prensa y por el índice de la FAA).

Estos huecos son la razón de la física híbrida: se integra lo que hay, se contrasta con la timeline pública y, si hace falta, se guía sin disfrazar el residual.

## 6. Implicaciones para la sim (muy corto)

- El desenlace del booster es aborto + FTS, no catch.
- La Ship hace catch en Pad 2 después de ~22,5 h; comprimir la costa.
- Modelo V3: tres grid fins, 33 + 6 motores, quema de aterrizaje del booster con 13, Ship 3–2–1.
- Cada número en el JSON lleva fuente y confianza.
- Un tuit de 2024 o un recuento de Wikipedia no se promociona a “oficial de 2026”.
