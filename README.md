# Disaster Solutions Navigator

Prototipo interactivo de constructsteel para navegar desde un riesgo urbano hasta una solución de ingeniería. Esta versión conserva el trabajo editable de Elías y lo organiza como proyecto de Visual Studio Code para que diseño 3D y programación avancen en paralelo.

## Puesta en marcha

Requisitos: Node.js 20 o superior y Visual Studio Code.

```bash
npm install
npm run dev
```

Abrir la dirección que muestra Vite (normalmente `http://localhost:5173`). No abrir `index.html` directamente: el navegador debe servir el GLB por HTTP.

## Reparto de trabajo

- Elías: `public/models/`, `public/reference/` y el panel visual que se abre con la tecla `E`.
- Franco: `src/main.js`, `src/styles/main.css` e `index.html`.
- Ambos: cambios pequeños, una rama por tarea y revisión mediante pull request.

## Estructura

```text
Disaster-Solutions-Navigator/
├── .vscode/                 configuración compartida de VS Code
├── docs/                    acuerdos técnicos y guías de trabajo
├── legacy/                  último HTML monolítico, sin modificar
├── public/
│   ├── models/              modelos GLB/GLTF listos para el navegador
│   └── reference/           referencia visual de los cinco niveles
├── src/
│   ├── main.js              configuración, motor Three.js y editor
│   └── styles/main.css      interfaz y responsive
├── index.html               estructura de la aplicación
└── package.json             comandos y versiones
```

## Flujo de cinco niveles

1. Hazard Area
2. Infrastructure
3. Mitigation Solutions
4. Solution Explorer
5. Details of the Solution en constructsteel

El prototipo actual implementa la escena de ciudad, la selección de infraestructura, los puntos de solución y el explorador con Sketchfab. La siguiente iteración debe hacer explícito el selector de hazard y separar la salida hacia constructsteel como nivel 5.

## Comandos

```bash
npm run dev       # desarrollo
npm run build     # versión optimizada en dist/
npm run preview   # comprobar el build localmente
```

Ver `docs/WORKFLOW.md` antes de empezar y `docs/ASSETS-3D.md` antes de reemplazar un modelo.
