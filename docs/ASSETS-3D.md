# Guía para Elías: modelos y contenido 3D

## Reemplazar el modelo principal

1. Exportar desde Blender como GLB, con texturas incluidas.
2. Mantener los nombres de objetos que usa el prototipo (`TERRAIN`, volumen cerrado, estructura abierta y empties de soluciones).
3. Reemplazar `public/models/DPR_CITY.glb` sin cambiar el nombre; o cambiar `CONFIG.model.url` al comienzo de `src/main.js`.
4. Ejecutar `npm run dev` y comprobar ciudad, edificio, marcadores, cámaras y animaciones.

## Convención sugerida en Blender

- `CITY_*`: volúmenes visibles en el nivel de ciudad.
- `STRUCTURE_*`: estructura abierta del nivel de infraestructura.
- `SOLUTION_RBS_01`, `SOLUTION_DAMPER_01`: empties para hotspots.
- `TERRAIN`: suelo.
- Animaciones: `earthquake_*`, `solution_*` o un nombre técnico claro.

## Criterios de exportación

- Aplicar transforms antes de exportar.
- Evitar nombres automáticos como `Cube.023`.
- Mantener origen y unidades consistentes.
- Optimizar texturas para web; 2K como máximo salvo una necesidad demostrada.
- Preferir GLB autocontenido para evitar archivos faltantes.
- Probar el modelo nuevo en una rama `3d/...` antes de integrarlo.

## Editor visual existente

Con el sitio abierto, presionar `E`. El panel permite reemplazar el modelo, ubicar edificios y soluciones, ajustar cámaras, iluminación, superficies, textos y animaciones. Guardar también el archivo de settings para que los cambios sean revisables.
