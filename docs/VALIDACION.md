# Validación — Starship Flight 15

<!-- Generado por src/validation. No editar a mano. -->

Aproximación educativa con datos públicos. No es telemetría ni una validación operativa.

Para regenerar: `UPDATE_REPORT=1 npm test -- src/validation`. Sin `UPDATE_REPORT=1`, el test no escribe el archivo.

## Línea de tiempo

Referencia independiente: [SPEC §2 y §8](SPEC.md) y [copia de la tabla pública en research §3](research.md#3-línea-de-tiempo-oficial-copia-de-trabajo).
Son 26 hitos públicos aproximados y una fila adicional de FTS: el relato ubica el FTS al corte, sin publicar un segundo independiente.
El reloj es impuesto; encendidos, cortes, despliegue y estados finales también están guiados por el programa. Medir cuándo cambia su salida comprueba la implementación, no una predicción física de esos horarios.
Max Q, chequeos, entrada, transónico, subsónico y flip se contrastan como marcadores de fase: no son detecciones físicas de presión dinámica, Mach ni actitud.
Se muestrea alrededor de cada referencia cada 0,25 s (±tolerancia más 2 s) y se refina cada transición detectada por bisección; a T+0 se observa el estado inicial.
Los residuales son **observado − referencia**. Un marcador sin transición o ambiguo no cuenta como aprobado.

| Hito | T+ público (s) | Tolerancia | Reloj impuesto: marcador medido (Δs) | Efectos observados en `sample` (Δs) |
| --- | ---: | ---: | --- | --- |
| `liftoff` | 00:00:00 (0) | ±2 s | Evento: 0.000 s (+0.000 s) | Motores Booster: 0.000 s (+0.000 s) inicio: 33 |
| `max_q` | 00:00:58 (58) | ±2 s | Evento: 58.000 s (+0.000 s) | Solo marcador |
| `meco` | 00:02:19 (139) | ±2 s | Evento: 139.000 s (+0.000 s) | Motores Booster: 139.000 s (+0.000 s) 33 → 3 |
| `hot_staging` | 00:02:21 (141) | ±2 s | Evento: 141.000 s (+0.000 s) | Motores Ship: 141.000 s (+0.000 s) 0 → 6 |
| `boostback_start` | 00:02:26 (146) | ±2 s | Evento: 146.000 s (+0.000 s) | Motores Booster: 146.000 s (+0.000 s) 3 → 32 |
| `boostback_shutdown` | 00:03:02 (182) | ±2 s | Evento: 182.000 s (+0.000 s) | Motores Booster: 182.000 s (+0.000 s) 32 → 0 |
| `booster_landing_burn_start` | 00:06:10 (370) | ±2 s | Evento: 370.000 s (+0.000 s) | Motores Booster: 370.000 s (+0.000 s) 0 → 13 |
| `booster_landing_burn_shutdown` | 00:06:35 (395) | ±2 s | Compartido con FTS | Motores Booster: 395.000 s (+0.000 s) 13 → 0 |
| `booster_fts` | 00:06:35 (395) | ±2 s | Evento: 395.000 s (+0.000 s) | Estado booster: 395.000 s (+0.000 s) landing-burn → fts |
| `ship_ascent_cutoff` | 00:08:09 (489) | ±2 s | Evento: 489.000 s (+0.000 s) | Motores Ship: 489.000 s (+0.000 s) 6 → 0 |
| `insertion_start` | 00:26:10 (1570) | ±5 s | Evento: 1570.000 s (+0.000 s) | Motores Ship: 1570.000 s (+0.000 s) 0 → 1 |
| `insertion_shutdown` | 00:26:30 (1590) | ±5 s | Evento: 1590.000 s (+0.000 s) | Motores Ship: 1590.000 s (+0.000 s) 1 → 0 |
| `payload_deploy_start` | 00:35:01 (2101) | ±5 s | Evento: 2101.000 s (+0.000 s) | Satélites: 2101.000 s (+0.000 s) 0 → 1 |
| `payload_deploy_complete` | 01:17:40 (4660) | ±5 s | Evento: 4660.000 s (+0.000 s) | Satélites: 4660.000 s (+0.000 s) 25 → 26 |
| `hawaii_check_early` | 01:27:46 (5266) | ±15 s | Evento: 5266.000 s (+0.000 s) | Solo marcador |
| `chile_check` | 07:15:35 (26135) | ±15 s | Evento: 26135.000 s (+0.000 s) | Solo marcador |
| `hawaii_check_final` | 20:41:55 (74515) | ±15 s | Evento: 74515.000 s (+0.000 s) | Solo marcador |
| `deorbit_start` | 21:35:57 (77757) | ±15 s | Evento: 77757.000 s (+0.000 s) | Motores Ship: 77757.000 s (+0.000 s) 0 → 1 |
| `deorbit_shutdown` | 21:36:07 (77767) | ±15 s | Evento: 77767.000 s (+0.000 s) | Motores Ship: 77767.000 s (+0.000 s) 1 → 0 |
| `entry` | 22:10:46 (79846) | ±5 s | Evento: 79846.000 s (+0.000 s) | Solo marcador |
| `transonic` | 22:29:34 (80974) | ±5 s | Evento: 80974.000 s (+0.000 s) | Solo marcador |
| `subsonic` | 22:30:13 (81013) | ±5 s | Evento: 81013.000 s (+0.000 s) | Solo marcador |
| `ship_landing_burn_start` | 22:32:16 (81136) | ±5 s | Evento: 81136.000 s (+0.000 s) | Motores Ship: 81136.000 s (+0.000 s) 0 → 3 |
| `landing_flip` | 22:32:18 (81138) | ±5 s | Evento: 81138.000 s (+0.000 s) | Solo marcador |
| `landing_3_to_2` | 22:32:26 (81146) | ±5 s | Evento: 81146.000 s (+0.000 s) | Motores Ship: 81146.000 s (+0.000 s) 3 → 2 |
| `landing_2_to_1` | 22:32:33 (81153) | ±5 s | Evento: 81153.000 s (+0.000 s) | Motores Ship: 81153.000 s (+0.000 s) 2 → 1 |
| `ship_catch` | 22:32:34 (81154) | ±5 s | Evento: 81154.000 s (+0.000 s) | Estado ship: 81154.000 s (+0.000 s) landing-burn → caught; Motores Ship: 81154.000 s (+0.000 s) 1 → 0 |

## Trayectoria: predicción bruta, guía y órbita

Para el arrastre se usan densidades tabuladas de la U.S. Standard Atmosphere 1976 (Tabla II), con interpolación logarítmica hasta 86 km. Por encima, se extrapola la última pendiente: no es la atmósfera superior del modelo estándar.

El error bruto se evalúa antes del ajuste radial. La altitud ajustada se toma en el encendido de la Ship observado; la altitud y el perigeo orbitales, justo después del corte de inserción observado.

| Magnitud | Referencia | Simulado | Residual | Tolerancia | Resultado |
| --- | ---: | ---: | ---: | ---: | --- |
| Staging bruto, antes de guía | 65 km | 70.263 | +5.263 | ±10 km | Dentro |
| Staging ajustado (Puente cinematográfico de ascenso de Ship y costa inicial; no telemetría) | 65 km | 65.000 | +0.000 | ±10 km | Dentro |
| Altitud post-inserción (Costa kepleriana anclada a la altitud orbital reportada) | 275 km | 275.000 | +0.000 | ±15 km | Dentro |
| Perigeo post-inserción | 275 km | 275.000 | +0.000 | ±15 km | Dentro |

Perigeo osculante durante inserción: **-32.151 → 275.000 km**; durante desórbita: **275.000 → 79.258 km**. Altitud en el marcador de entrada: 100.345 km.
Perigeo reportado por McDowell: ~276 km (vía Wikipedia, ver [research §2](research.md#ship-como-voló)); no es una referencia oficial adicional.
Después de la inserción, el estado ECI da perigeo 275.000 km al recalcular con μ WGS 84. El simulador informa apogeo 275.000 km, inclinación 25.997°, período 5400.708 s y excentricidad 0.000000 (sin referencia de vuelo validada).

## Corte cinematográfico en la entrada

En T+79846.000 s el modelo pasa de la costa kepleriana a un tramo cinematográfico local. El salto se calcula entre los dos estados ECI del simulador en ese mismo instante:

- Desplazamiento `‖r después − r antes‖`: **8820.103 km**.
- Diferencia vectorial de velocidad `‖v después − v antes‖`: **8382.945 m/s** (rapideces inerciales: 7889.709 → 1975.825 m/s).

Es una discontinuidad deliberada del modelo, no un residual contra telemetría ni el Δv de una quema. No hay un límite publicado para comparar esos saltos: el test verifica el instante y los estados, no exige continuidad física. El tramo posterior no permite inferir el corredor real, las cargas en la transición ni las solicitaciones aerotérmicas.

## Desenlace observado

- Booster justo antes del FTS: altitud 20.016 m, velocidad relativa al suelo 0.325 m/s, distancia a Pad 2 43.681 km, al este del pad. El desplazamiento al este, la altitud baja y la poca velocidad son comprobaciones cualitativas del desvío y hover, no coordenadas reales ni una prueba cartográfica de la costa.
- Booster al FTS: estado `fts`, motores 0. No se usa el rótulo de catch incorrecto de la tabla pública.
- Ship en la catch: estado `caught`, motores 0, distancia horizontal al Pad 2 0.000 m (ECI convertido a Tierra fija). La altura real de los brazos no está publicada.

## Δv de las maniobras

Estimaciones y entradas del modelo, no telemetría. El Δv reportado de inserción se usa como entrada, por lo que el residual no es una validación independiente. Sin tolerancia numérica publicada; un `null` significa que el modelo no informa un Δv para esa maniobra.

| Maniobra | Δv modelo (m/s) | Referencia (m/s) | Residual (m/s) |
| --- | ---: | --- | ---: |
| `liftoff` | No evaluable: el modelo no informa Δv | No evaluable: sin referencia publicada | — |
| `hot_staging` | No evaluable: el modelo no informa Δv | No evaluable: sin referencia publicada | — |
| `boostback_start` | No evaluable: el modelo no informa Δv | No evaluable: sin referencia publicada | — |
| `booster_landing_burn_start` | No evaluable: el modelo no informa Δv | No evaluable: sin referencia publicada | — |
| `insertion_start` | 92.000 | ~92 (McDowell, reportado) | +0.000 |
| `deorbit_start` | 58.000 | No evaluable: sin referencia publicada | — |
| `ship_landing_burn_start` | No evaluable: el modelo no informa Δv | No evaluable: sin referencia publicada | — |

## Estimaciones declaradas en `data/flight15.json`

| Parámetro | Valor | Confianza | Fuente / nota |
| --- | --- | --- | --- |
| `model.ascent.step_s` | 0.1 s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Paso fijo RK4 recomendado por el spec. |
| `model.ascent.booster_dry_mass_kg` | 250000 kg | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Orden de magnitud de trabajo para la masa; no sustituye la masa seca unknown de B22. |
| `model.ascent.ship_dry_mass_kg` | 170000 kg | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Orden de magnitud de trabajo para la masa; no sustituye la masa seca unknown de S42. |
| `model.ascent.booster_propellant_kg` | 3600000 kg | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Carga inicial didáctica inferior a capacidad de diseño y suficiente para el consumo del tramo integrado; carga real no publicada. |
| `model.ascent.ship_propellant_kg` | 1550000 kg | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Carga inicial didáctica inferior a capacidad de diseño; carga real no publicada. |
| `model.ascent.isp_s` | 330 s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Isp efectivo provisional de la integración, no cifra confirmada de Raptor 3. |
| `model.ascent.drag_cd` | 0.4 1 | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Coeficiente de arrastre constante ilustrativo, sin ajuste aerodinámico. |
| `model.ascent.pitch_start_s` | 12 s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Inicio de inclinación ilustrativa; no reconstruye el programa de vuelo. |
| `model.ascent.staging_tilt_deg` | 66 deg | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Inclinación máxima de la receta abierta desde la vertical; proyección local al este sin afirmar azimut real. |
| `model.ascent.post_meco_engines` | 3 engines | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Número de trabajo visual entre MECO y boostback; la tabla pública sólo indica corte de la mayoría. |
| `model.booster.coast_apex_altitude_m` | 82000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo cinematográfico al corte del boostback, no apogeo medido. |
| `model.booster.coast_east_m` | 20000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Desplazamiento dibujado al corte para mostrar desvío, no downrange reportado. |
| `model.booster.coast_north_m` | -5000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Componente visual hacia el Golfo al corte, no coordenada reconstruida. |
| `model.booster.offshore_east_m` | 42000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Distancia visual que separa el FTS del pad; no distancia real. |
| `model.booster.offshore_north_m` | -12000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Componente sur visual para el cierre offshore; no punto de FTS real. |
| `model.booster.burn_start_altitude_m` | 900 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo visual al encender; sin medición pública. |
| `model.booster.hover_altitude_m` | 20 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Separación visual entre vehículo y agua; no altura real. |
| `model.booster.burn_start_vertical_speed_ms` | -65 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente descendente visual antes del hover, no velocidad real. |
| `model.ship.kepler_join_s` | 1180 s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Fin ilustrativo del puente entre ascenso y preinserción kepleriana; no evento de vuelo. |
| `model.ship.seco_altitude_m` | 180000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo de altura visual al cutoff; sin medición pública. |
| `model.ship.seco_east_m` | 1450000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo de avance ilustrativo para puente de ascenso, no downrange reportado. |
| `model.ship.seco_east_speed_ms` | 5600 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente ilustrativa en SECO, no telemetría. |
| `model.ship.deorbit_delta_v_ms` | 58 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Pulso fijo retrógrado de la sim para bajar el perigeo; no Δv publicado ni solución de apuntado. |
| `model.ship.return_east_m` | 23000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Desplazamiento cinematográfico al subsónico sobre el Golfo; no ruta publicada. |
| `model.ship.return_north_m` | -7000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Componente visual al subsónico; no corredor de vuelo. |
| `model.ship.transonic_altitude_m` | 11000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo de altura visual al transónico; sin medición pública. |
| `model.ship.transonic_east_m` | 34000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo cinematográfico previo al swoosh, no posición reportada. |
| `model.ship.transonic_north_m` | -7000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Componente sur visual al transónico; no recorrido de vuelo. |
| `model.ship.subsonic_altitude_m` | 7200 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo de altura visual al subsónico; sin medición pública. |
| `model.ship.landing_start_east_m` | 850 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo ilustrativo al iniciar quema; no posición real. |
| `model.ship.landing_start_altitude_m` | 320 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo ilustrativo al iniciar quema; no medición pública. |
| `model.ship.flip_east_m` | 720 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo ilustrativo de desplazamiento en el flip; no posición real. |
| `model.ship.flip_altitude_m` | 280 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Nudo ilustrativo de altura en el flip; no medición pública. |
| `model.ship.catch_altitude_m` | 90 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Altura visual del encuentro con torre; altura real de captura desconocida. |
| `model.ship.insertion_anchor_east_m` | 8500000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Avance de arco desde Pad 2 para la fase ilustrativa al terminar inserción; no longitud de vuelo medida. |
| `model.ship.entry_east_m` | 1150000 m | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Inicio del tramo local visual sobre el Golfo después del corte, no punto real de entrada. |
| `model.ship.entry_east_speed_ms` | -2400 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente ilustrativa hacia el oeste al inicio del tramo local; no velocidad de entrada real. |
| `model.ship.entry_vertical_speed_ms` | -95 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente radial descendente del tramo local después del corte, no velocidad medida. |
| `model.ship.transonic_east_speed_ms` | -330 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente visual del orden de la velocidad del sonido en este tramo; no Mach calculado. |
| `model.ship.transonic_vertical_speed_ms` | -100 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente radial descendente para unir los nudos sin detener la nave. |
| `model.ship.subsonic_east_speed_ms` | -240 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente horizontal subsonica ilustrativa, no telemetría. |
| `model.ship.subsonic_vertical_speed_ms` | -85 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente radial descendente subsonica ilustrativa, no telemetría. |
| `model.ship.landing_start_east_speed_ms` | -70 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente horizontal visual al activar la quema; no telemetría. |
| `model.ship.landing_start_vertical_speed_ms` | -24 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente radial descendente al activar la quema; no telemetría. |
| `model.ship.flip_east_speed_ms` | -55 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente horizontal visual al flip, no telemetría. |
| `model.ship.flip_vertical_speed_ms` | -17 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Tangente radial visual al flip, no telemetría. |
| `model.satellites.delta_v_span_ms` | 1.8 m/s | estimate | [Fuente](SPEC.md#5-cómo-simular-recomendación-híbrido): Dispersión tangencial total visual entre 26 liberaciones uniformes en la ventana pública; no velocidades de expulsión medidas. |

## Datos desconocidos: no evaluables

Un valor simulado para una magnitud sin referencia publicada no rellena el `null` ni se considera oficial. Ver también los huecos no tabulados en [research §5](research.md#5-qué-no-apareció-huecos-que-importan-al-sim).
Chequeo de UI (manual, no cubierto por este test): en el HUD, ninguna magnitud `unknown` debe llevar la etiqueta «Oficial»; si se muestra un valor del modelo, tiene que indicar su procedencia estimada, interpolada o calculada.

| Campo en el JSON | Estado | Nota |
| --- | --- | --- |
| `mission.payload.unit_mass_kg` | `unknown` / no evaluable | No verificado un filing primario que aplique con certeza a estos V3. |
| `mission.orbit.apogee_km` | `unknown` / no evaluable | Wikipedia lista 278 km sin cita sólida en ese campo. |
| `mission.orbit.inclination_deg` | `unknown` / no evaluable | Wikipedia lista 30.5° sin cita sólida en ese campo. |
| `mission.outcomes.booster.splashdown_coordinates` | `unknown` / no evaluable | no publicado |
| `site.tower_height_m` | `unknown` / no evaluable | SpaceX no publica la altura. En v1 usar una torre reconocible sin afirmar el metro. |
| `vehicle.stack.dry_mass_kg` | `unknown` / no evaluable | no publicado |
| `vehicle.stack.gross_liftoff_mass_kg` | `unknown` / no evaluable | No usar la PEA 2022 (~5000 t) como masa del Flight 15 / V3. |
| `vehicle.booster.dry_mass_kg` | `unknown` / no evaluable | La cifra de 275 t en Wikipedia corresponde al recuadro de Block 1/2, no se adopta para B22. |
| `vehicle.ship.dry_mass_kg` | `unknown` / no evaluable | no publicado |
| `vehicle.raptor.isp_sea_level_s` | `unknown` / no evaluable | No está en la ficha 2026. Ver physics_estimates. |
| `vehicle.raptor.isp_vacuum_s` | `unknown` / no evaluable | Un tuit de SpaceX del 3 ago 2024 citó 350 s para la variante SL; hay recuentos que lo tratan como Isp de vacío. No se adopta como oficial vigente. |
| `timeline.max_q.altitude_m` | `unknown` / no evaluable | no publicado |
| `physics_estimates.booster_dry_mass_kg` | `unknown` / no evaluable | Ajustable. No hay cifra oficial para V3. |
| `physics_estimates.ship_dry_mass_kg` | `unknown` / no evaluable | Ajustable. No hay cifra oficial para V3. |
| `physics_estimates.raptor_sl_isp_s` | `unknown` / no evaluable | Hueco. Si se pone un valor de partida, etiquetarlo estimate y citar la fuente (p. ej. discusión del tuit 2024 de 350 s). |
| `physics_estimates.raptor_vac_isp_s` | `unknown` / no evaluable | no publicado |
| `physics_estimates.drag_cd` | `unknown` / no evaluable | Cd constante de partida, ajuste contra la timeline. |
| `physics_estimates.reference_area_m2` | `unknown` / no evaluable | Un punto de partida geométrico sería pi*(4.5^2) para un cilindro de 9 m, pero es una simplificación, no un dato oficial. |
| `model.maneuvers.liftoff` | `unknown` / no evaluable | Sin Δv aislable de despegue: el ascenso expone empuje y consumo, no un impulso instantáneo. |
| `model.maneuvers.boostback_start` | `unknown` / no evaluable | Curva cinematográfica sin empuje integrado; no evaluable. |
| `model.maneuvers.booster_landing_burn_start` | `unknown` / no evaluable | Curva cinematográfica sin empuje integrado; no evaluable. |
| `model.maneuvers.hot_staging` | `unknown` / no evaluable | Encendido y separación publicados, ascenso de Ship posterior cinematográfico; no evaluable. |
| `model.maneuvers.ship_landing_burn_start` | `unknown` / no evaluable | Curva cinematográfica sin empuje integrado; no evaluable. |
