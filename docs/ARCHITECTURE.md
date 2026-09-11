# Arquitectura y próximos pasos

## Estado actual

- `index.html`: estructura accesible de la experiencia y del editor.
- `src/styles/main.css`: estilos, estados, paneles y responsive.
- `src/main.js`: configuración editable, motor Three.js, navegación, hotspots, Sketchfab y editor visual.
- `public/models/DPR_CITY.glb`: modelo que estaba embebido en el HTML original.
- `legacy/`: respaldo exacto del último entregable de Elías.

## Modelo de navegación acordado

| Nivel | Decisión del usuario | Resultado |
| --- | --- | --- |
| 1. Hazard Area | Selecciona riesgo y área | Contexto urbano afectado |
| 2. Infrastructure | Selecciona activo expuesto | Edificio, puente, ruta o instalación |
| 3. Mitigation Solutions | Selecciona hotspot | Ubicación y protección de la solución |
| 4. Solution Explorer | Explora funcionamiento | 3D, animación, video y principios |
| 5. Details | Abre constructsteel | Ficha técnica, casos y proveedores |

## Orden recomendado de implementación

1. Formalizar el estado de navegación con `hazardId`, `areaId`, `assetId` y `solutionId`.
2. Mover textos y enlaces de soluciones a archivos de datos, sin alterar el motor 3D.
3. Implementar selector de hazards y activos.
4. Convertir el modal actual en el Level 4 completo.
5. Reservar los enlaces externos de constructsteel para Level 5.
6. Agregar pruebas de navegación y una comprobación de carga de cada GLB.

La división inicial evita una reescritura riesgosa antes de la reunión de octubre. La separación adicional de `src/main.js` debe realizarse por comportamiento y acompañada por pruebas del flujo completo.
