# MoviMexa · Prototipo del frontend

Simulador interactivo en React + Vite, con paleta Mercury, diseño oscuro y relieve suave. Funciona en el navegador, sin conectar el backend.

## Ejecutar en tu proyecto

Abre una terminal en `C:/httdocs/MoviMexa/frontend` y ejecuta:

```powershell
npm run dev
```

Abre la dirección local que muestre Vite. Si copias este paquete en otra carpeta, instala primero sus dependencias con `npm ci`.

## Recorrido de la demostración

1. Crea un perfil con datos ficticios, inicia una sesión demo o entra como invitado. La contraseña no se almacena ni se verifica contra un servicio.
2. Busca una combinación de origen y destino. El catálogo admite únicamente el sentido indicado y muestra un estado sin resultados para combinaciones no disponibles.
3. Elige una ruta y una parada de abordaje. El destino final no se puede seleccionar como parada de subida.
4. Inicia el seguimiento. Consulta las tres próximas unidades y el avance de la elegida.
5. Usa las velocidades ×1, ×30 o ×60. Puedes pausar y añadir una demora mientras esperas.
6. El recorrido pasa por espera, abordaje, trayecto y llegada. Finaliza para guardar el viaje en el historial.
7. Guarda rutas con el corazón, consulta la ayuda o reinicia tu perfil desde Mi perfil.

## Datos y alcance

- Se conservan las ocho entradas proporcionadas. Los identificadores 01–08 son referencias internas, no números oficiales de transporte.
- Las entradas 05 y 07 mantienen el mismo origen y destino, tal como aparecen en la lista recibida.
- Duraciones, frecuencias, distancias, unidades y paradas intermedias son ejemplos de demostración. No son datos operativos ni indicaciones para un traslado real.
- El mapa es un esquema SVG ilustrativo, no un mapa geográfico ni un sistema GPS.
- El reloj de la demostración comienza al iniciar el seguimiento. La hora estimada se calcula con ese reloj y permanece coherente al acelerar o pausar.
- Una demora prolonga la espera. La unidad puede permanecer antes de la parada durante ese tiempo. Las tres unidades usan el mismo modelo de estimación y la frecuencia de cada ruta.
- El perfil, las rutas guardadas y hasta 30 viajes completos se guardan en `localStorage`. Se comparten entre las sesiones demo del mismo navegador. Los viajes en curso y las preferencias temporales se reinician al recargar.
- No se almacenan contraseñas ni se envían datos al backend. No hay autenticación real, correo de verificación, Google OAuth ni permisos de ubicación.

## Componentes adjuntos adaptados

- `AuthPanel.jsx`: adaptación de `SignIn1`, con registro, sesión de demostración, acceso invitado y validación en español.
- `Loader.jsx`: adaptación del cargador de anillos, usando animación CSS y movimiento reducido.
- `CircularSplitRoll.jsx`: adaptación de la galería circular para explorar rutas, con controles accesibles y una composición móvil simplificada.

Se mantienen React, JSX y CSS del proyecto existente. No se requieren Tailwind, shadcn, TypeScript, GSAP ni Motion para estas adaptaciones. Se sustituyen imágenes y marcas ajenas por gráficos de movilidad. Las tipografías web, si están disponibles, se cargan de Google Fonts; hay fuentes locales de respaldo.

## Archivos principales

```text
src/
  App.jsx                      # Navegación y experiencia completa
  App.css                      # Diseño adaptable del panel
  index.css                    # Paleta, tipografías y estilos base
  main.jsx                     # Entrada de React
  components/
    Icon.jsx                   # Iconos SVG
    RouteMap.jsx               # Mapa ilustrativo y unidades
    ui/
      AuthPanel.jsx + auth.css
      Loader.jsx + loader.css
      CircularSplitRoll.jsx + circular-split-roll.css
  data/routes.js               # Catálogo y valores simulados
  lib/simulation.js            # Cálculo de fases, unidades y estimaciones
  lib/storage.js               # Persistencia local tolerante a errores
tests/simulation.test.mjs       # Pruebas de tiempos, demoras y fases
public/movimexa.svg             # Icono de la aplicación
```

Para cambiar rutas y valores del demo, edita `src/data/routes.js`. Para conectar el backend en una etapa posterior, sustituye la creación del perfil y el origen de los datos; conserva los componentes de presentación.

## Verificar

```powershell
npm run lint
npm run test
npm run build
```

La compilación se escribe en `dist`. Para revisarla usa `npm run preview`; no abras `dist/index.html` directamente con doble clic.

## Instalar el código descargado

El ZIP contiene una carpeta `frontend` con código fuente, configuración y esta guía. Copia su contenido a `C:/httdocs/MoviMexa/frontend` después de respaldar cambios propios. No contiene ni modifica `backend`, tampoco incluye `node_modules`.
