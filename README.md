# Starship Flight 15 · recorrido de la misión

**Aproximación educativa con datos públicos. No es un producto oficial de SpaceX ni muestra telemetría interna.** No sirve para operar vehículos ni para sacar conclusiones forenses sobre el vuelo.

## Cómo correrlo

Con Node.js y npm instalados, ejecutá `npm ci` y después `npm run dev`. Abrí la dirección local que imprime Vite. Para correr las pruebas usá `npm test`; para compilar el sitio estático, `npm run build`. La instalación necesita los paquetes de npm; la aplicación no necesita servicios externos, mapas remotos ni claves.

## Qué estás viendo

Usá la barra de tiempo para comparar los dos regresos. En T+00:06:35 el booster queda sobre el Golfo: corta los motores y se activa el sistema de terminación de vuelo (FTS). **No volvió a la torre**. La captura de Pad 2 en T+22:32:34 es la de la Ship, después del despliegue de los 26 Starlink V3.

La [línea de tiempo y los parámetros](data/flight15.json) conservan sus fuentes. Un horario oficial es aproximado: no convierte en oficial la posición del vehículo a esa hora. No se publicaron las coordenadas del FTS, la carga real de propelente, las masas secas ni el segundo exacto de despegue. Las capacidades de diseño no son cargas medidas. La ficha da 1.614 tf para la Ship; la suma de las cifras por motor da 1.575 tf. No las promediamos.

[Especificación](docs/SPEC.md) · [Investigación y huecos](docs/research.md) · [Licencia MIT](LICENSE)
