# Starship Flight 15 · recorrido de la misión

**Aproximación educativa con datos públicos. No es un producto oficial de SpaceX ni muestra telemetría interna.** No sirve para operar vehículos ni para sacar conclusiones forenses sobre el vuelo.

## Cómo correrlo

Con Node.js y npm instalados, ejecutá `npm ci` y después `npm run dev`. Abrí la dirección local que imprime Vite. Para correr las pruebas usá `npm test`; para compilar el sitio estático, `npm run build`. La instalación necesita los paquetes de npm; la aplicación no necesita servicios externos, mapas remotos ni claves.

## Controles

- **Tiempo:** Espacio reproduce o pausa; las teclas `1` a `4` eligen 1×, 10×, 100× y 1000×. `,` y `.` recorren los eventos. También podés arrastrar la barra o elegir un hito en el registro.
- **Cámara:** `T` Tierra, `O` órbita, `S` Ship, `B` booster, `P` torre y `F` libre. Arrastrá para orbitar, usá la rueda para acercarte y el botón derecho para desplazarte. `R` reencuadra.
- **Capas:** `L` muestra la órbita osculante; `G`, la traza terrestre; `K`, los rastros. `E` cambia la escala visual de los vehículos, no sus dimensiones ni la dinámica. `I` abre las fuentes y `H` muestra los atajos.

Para ver la inserción sin esperar, elegí su inicio en el registro, activá la cámara **Órbita** y reproducí a 1×. Mirá cómo sube el perigeo durante la quema. Para comparar los regresos, saltá primero al FTS y después a la captura, con las cámaras **Booster** y **Torre** respectivamente.

## Qué estás viendo

Usá la barra de tiempo para comparar los dos regresos. En T+00:06:35 el booster queda sobre el Golfo: corta los motores y se activa el sistema de terminación de vuelo (FTS). **No volvió a la torre**. La captura de Pad 2 en T+22:32:34 es la de la Ship, después del despliegue de los 26 Starlink V3.

La [línea de tiempo y los parámetros](data/flight15.json) conservan sus fuentes. Un horario oficial es aproximado: no convierte en oficial la posición del vehículo a esa hora. No se publicaron las coordenadas del FTS, la carga real de propelente, las masas secas ni el segundo exacto de despegue. Las capacidades de diseño no son cargas medidas. La ficha da 1.614 tf para la Ship; la suma de las cifras por motor da 1.575 tf. No las promediamos.

## Cómo leer la trayectoria

El reloj sigue los hitos aproximados de la misión, no una detección automática de Max Q, encendidos o captura. El ascenso del stack integra gravedad, empuje, consumo y arrastre. Se le aplica un ajuste radial para pasar por la altitud de separación reportada. Las masas del modelo, el Isp, el Cd y la carga inicial son hipótesis, no mediciones de B22 o S42. El regreso del booster y el tramo final de la Ship son reconstrucciones cinematográficas.

Para la inserción se usa un estado final anclado en una órbita circular de 275 km y un pulso de unos 92 m/s reportado indirectamente. Por eso el cierre en 275 km **no es una predicción**. El perigeo, apogeo, período e inclinación que ves se calculan desde posición y velocidad. La desórbita usa un pulso estimado. Los satélites continúan sus órbitas sin acompañar a la Ship en el regreso; sus instantes individuales de liberación y su separación relativa no son telemetría.

**En T+22:10:46 hay un corte de escena, no una maniobra.** La órbita ilustrativa no determina dónde entró la Ship real. Para mostrar el regreso al Golfo, la reconstrucción conserva la altura pero cambia de posición y velocidad. El [informe de validación](docs/VALIDACION.md) cuantifica ese salto por separado de las tolerancias de vuelo. No lo interpretes como un Δv de motor.

[Especificación](docs/SPEC.md) · [Investigación y huecos](docs/research.md) · [Licencia MIT](LICENSE)
