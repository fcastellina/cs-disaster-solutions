# Trabajo en paralelo

## Regla principal

El código y los assets no deben editarse en la misma rama. Esto reduce casi todos los conflictos entre programación y diseño 3D.

## Una sola preparación inicial

```bash
git init
git add .
git commit -m "chore: initial navigator project"
git branch -M main
```

Después se sube el repositorio a GitHub, GitLab o al servicio elegido por el equipo.

## Rama de Elías

```bash
git switch main
git pull
git switch -c 3d/nombre-del-cambio
```

Trabaja principalmente en `public/models/` y, cuando sea necesario, genera un archivo de configuración desde el editor visual (`E`). No debe editar `src/main.js` manualmente sin coordinarlo antes.

## Rama de Franco

```bash
git switch main
git pull
git switch -c feature/nombre-del-cambio
```

Trabaja en navegación, comportamiento, accesibilidad y responsive. Evita reemplazar archivos dentro de `public/models/` en su rama.

## Entrega de cada cambio

```bash
npm run build
git add .
git commit -m "tipo: descripción corta"
git push -u origin nombre-de-la-rama
```

Abrir un pull request y pedir la revisión del otro integrante. No mezclar cambios directamente sobre `main`.

## Nombres de commits

- `feat:` función nueva
- `fix:` corrección
- `3d:` modelo, material, cámara o animación
- `content:` textos, proveedores o enlaces
- `docs:` documentación
- `chore:` mantenimiento

## Archivos GLB grandes

Si el repositorio rechaza modelos por tamaño, activar Git LFS antes de subirlos:

```bash
git lfs install
git lfs track "*.glb" "*.gltf" "*.bin"
git add .gitattributes
```
