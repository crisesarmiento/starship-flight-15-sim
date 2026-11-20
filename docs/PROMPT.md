# Prompt de arranque para OpenCode (una sola corrida con /deepwork)

Abrí OpenCode en la carpeta del repo, revisá que `/preset` diga `test-astra-sol-2026-11-19` y pegá esto como primer mensaje:

---

/deepwork Construí de punta a punta, en una sola corrida, la simulación interactiva en three.js del SpaceX Starship Flight 15 que describe `docs/SPEC.md`.

Antes de empezar, leé completos `docs/SPEC.md`, `docs/research.md` y `data/flight15.json`. El spec es la fuente de verdad. Sus etapas (de la 0 a la 8, incluida la 7.5) son tu checklist interna, y sus checks son los criterios de aceptación.

Cómo trabajar:
- Avanzá por tus pasadas de deepwork (boceto, estructura, detalle) sin frenar a pedir permiso entre etapas. Cristian quiere el resultado completo de una vez.
- Como orquestador, delegá la implementación y las correcciones al fixer con encargos acotados: objetivo, archivos, checks y qué no tocar. Lo visual de la escena y de la UI va al designer.
- Pasá cada pasada por la revisión del Oracle, y en las partes de física, desenlace del vuelo, órbita y validación (etapas 4, 5, 6, 7 y 7.5) no la saltees.
- Verificá vos mismo cada check del spec con tests o con evidencia concreta. No bajes tolerancias ni saltees tests en silencio.
- Hacé commits chicos, uno por etapa cuando se pueda, en la rama main local. No hagas push.

Reglas sin excepción:
- Es una aproximación hecha con datos públicos, no un producto oficial de SpaceX. El disclaimer va en el README y en la UI.
- No inventes números. Cada magnitud va en `data/flight15.json` con su fuente y su nivel de confianza. Si no hay fuente, el valor es null o una estimación marcada como tal.
- Implementá lo que realmente voló. El booster no fue atrapado: se desvió, hizo hover sobre el Golfo y lo destruyó el FTS. La Ship sí fue atrapada en Pad 2, después de desplegar los 26 Starlink V3.
- Los elementos orbitales (perigeo, apogeo, inclinación, período) se calculan siempre desde el vector de estado.
- Sin secretos, sin servicios pagos y sin datos de terceros en runtime. No uses sudo. No toques auth, claves ni tokens.
- El código va en inglés. La UI y el README, en español rioplatense claro.
- Anotá la evaluación en `NOTES-EVAL.md` como pide la sección 10 del spec: rol, trabajo hecho, hora, duración, cuota visible y calidad.

Al terminar, respondé con un informe corto con estas partes:
1. Qué anda: cómo correrlo y qué checks pasaron.
2. Qué es aproximado o guiado por la línea de tiempo, con sus residuales.
3. Qué falta o qué falló.
4. Qué hizo cada rol.
