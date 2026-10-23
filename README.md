# MoviMexa

**Tu ciudad, más cerca.**

Prototipo de transporte público para crear un perfil, encontrar una ruta y seguir el recorrido de una unidad hasta el destino.

Construido con **React + Vite**, paleta **Mercury** y un diseño oscuro con sombras suaves. Se adapta a computadora y móvil.

> Este proyecto es una demostración. Los tiempos, las unidades, las distancias y las paradas intermedias son simulados. El mapa es ilustrativo y no utiliza GPS.

## Empezar

En una terminal, entra al frontend:

```powershell
cd C:/httdocs/MoviMexa/frontend
npm run dev
```

Abre la dirección que muestre Vite, normalmente **http://localhost:5173/MoviMexa/**. El proyecto tiene configurada la ruta base `/MoviMexa/`.

**Si acabas de descargar el proyecto:** ejecuta `npm ci` antes de `npm run dev`. Necesitas Node.js compatible con el Vite instalado; el proyecto se verificó con Node 24.

## Probar el demo

1. **Entra.** Crea un perfil con datos ficticios o pulsa *Continuar como invitado*.
2. **Busca.** Elige origen y destino, y selecciona una ruta.
3. **Elige tu parada.** Indica dónde vas a subir.
4. **Sigue tu unidad.** Pulsa *Iniciar seguimiento* para ver la espera y el recorrido.
5. **Prueba escenarios.** Pausa, cambia la velocidad o añade una demora mientras esperas.
6. **Finaliza.** Al llegar, guarda el recorrido en *Mis viajes*.

| Control | Qué hace |
| --- | --- |
| ×1 | Un segundo equivale a un segundo de viaje. |
| ×30 | Un segundo equivale a 30 segundos de viaje. |
| ×60 | Un segundo equivale a un minuto de viaje. |
| Simular demora | Añade 3 minutos a la espera. |
| Corazón | Guarda una ruta para consultarla después. |

## Qué incluye

- Registro e inicio de sesión **de demostración**, con validaciones.
- Las ocho rutas proporcionadas, búsqueda y mensajes sin resultados.
- Selección de parada, tres próximas unidades y tiempos aproximados.
- Seguimiento por etapas: espera → abordaje → recorrido → llegada.
- Rutas guardadas, historial, avisos dentro de la app y ayuda.
- Los componentes de acceso, cargador y galería circular adaptados al proyecto.

## Datos y privacidad

El frontend funciona sin conectarse al backend. El inicio de sesión no verifica credenciales reales y **la contraseña nunca se guarda**.

El perfil, las rutas guardadas y hasta 30 viajes terminados se conservan en este navegador. Las sesiones demo del mismo dispositivo comparten esos datos. Puedes eliminarlos desde *Mi perfil*. El viaje en curso se reinicia al recargar.

Los números **01–08** identifican entradas del catálogo, no rutas oficiales. Las entradas **05 y 07** mantienen el mismo origen y destino porque así aparecen en la lista recibida.

## Editar el proyecto

| Archivo | Para qué sirve |
| --- | --- |
| `src/App.jsx` | Pantallas, navegación y flujo del demo. |
| `src/App.css` | Diseño del panel y adaptación móvil. |
| `src/index.css` | Paleta, tipografías y estilos base. |
| `src/data/routes.js` | Rutas, paradas y valores simulados. |
| `src/lib/simulation.js` | Tiempos, etapas y avance de las unidades. |
| `src/lib/storage.js` | Guardado local en el navegador. |
| `src/components/RouteMap.jsx` | Mapa ilustrativo. |
| `src/components/ui/` | Registro, cargador y galería circular. |
| `tests/simulation.test.mjs` | Pruebas de la simulación. |

**Para cambiar los datos del demo**, empieza por `src/data/routes.js`. **Para cambiar colores**, usa las variables Mercury de `src/index.css`.

Los componentes adjuntos se adaptaron a JSX y CSS. No necesitas añadir Tailwind, shadcn, TypeScript, GSAP ni Motion. Las tipografías de Google Fonts tienen fuentes locales de respaldo.

## Verificar y compilar

```powershell
npm run lint
npm run test
npm run build
```

La versión compilada queda en `dist`. Para verla:

```powershell
npm run preview
```

Abre la dirección de la terminal. No abras `dist/index.html` con doble clic.

## Si algo no funciona

| Situación | Solución |
| --- | --- |
| No se reconoce `npm` | Instala Node.js y vuelve a abrir la terminal. |
| Faltan dependencias | Ejecuta `npm ci` dentro de `frontend`. |
| No aparece una ruta | El catálogo solo admite las combinaciones y sentidos indicados. Limpia los filtros. |
| El viaje parece detenido | Revisa si está pausado o selecciona ×30 o ×60. |
| No se conservan los datos | El navegador puede estar bloqueando el almacenamiento local. |

El ZIP contiene solo el **frontend**. Al copiarlo, respalda tus cambios anteriores y conserva la carpeta `backend`.
