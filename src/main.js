/* ============================================================================

   DPR RESILIENCE CITY
   Three level city viewer: city  >  building  >  solution

   HOW THIS FILE IS ORGANISED
     1. CONFIG          everything you will ever want to change
     2. ENGINE          scene, camera, levels, markers, modal
     3. EDIT PANEL      the visual editor behind the E key

   You only need section 1. Press E in the browser to change things visually,
   then press "Copy settings" and paste the result back over section 1.

   ============================================================================ */


/* ===== CONFIG START =====================================================
   Everything between CONFIG START and CONFIG END is replaced when you paste
   the output of the edit panel. Do not move these two marker lines.
   ======================================================================== */
const CONFIG = {

  /* the 3D file */
  model: {
    url: "/models/DPR_CITY.glb",   // sits next to this HTML file
    terrainNode: "TERRAIN"   // ground plane, shown at every level
  },

  /* the ground plane */
  ground: {
    visible: true,   // false hides the very large ground plane so the backdrop shows
    useModelMaterial: false,   // true uses the material assigned in Blender
    color: "#A8C24E",
    roughness: 0.96
  },

  /* how the closed volume is drawn at level 1 */
  cityShape: {
    forceOpaque: true   // draws the level 1 volume solid instead of as glass
  },

  /* interface wording */
  text: {
    title: "constructsteel · Resilience City",
    subtitle: "Select a location to explore a steel solution in context.",
    hintCity: "Select a building",
    hintBuilding: "Select a solution",
    back: "← Back to city",
    explore: "Explore solution ↗",
    provider: "Visit provider ↗",
    details: "Solution details ↗",
    modalKicker: "Interactive solution model"
  },

  /* colours */
  colors: {
    brand: "#035DAD",
    brandDark: "#00243F",
    paper: "#EEF1F4",
    skyTop: "#F4F8FA",
    skyBottom: "#DCE6EC"
  },

  /* level 1: the isometric city view */
  cityView: {
    fit: "auto",   // 'auto' or 'solutions' or 'building' frame automatically, 'manual' uses the values below
    azimuth: -34,   // degrees around the vertical axis
    elevation: 38,   // degrees above the horizon
    padding: 3.55,   // used by the automatic framing modes
    frustum: 320,   // used by manual framing. Smaller number = closer
    target: [0, 150, 0]   // the point the camera looks at
  },

  /* level 2: how far the user may orbit */
  orbit: {
    free: false,   // true ignores every orbit limit
    polarMin: 2,   // lowest angle above the horizon, negative allows looking from below
    polarMax: 88,   // highest angle
    zoomMin: 0.2,   // how far out the user may zoom
    zoomMax: 14   // how far in
  },

  /* how long each move takes, in milliseconds */
  transitions: {
    toCity: 1600,
    toBuilding: 2100,
    toSolution: 1100,
    fadeStart: 0.6,   // when the dissolve begins, as a fraction of the move
    fadeEnd: 1,   // when the dissolve finishes
    fadeSharpness: 1.3,   // higher spends less time half way between the two shapes
    fadeMode: "inFirst",   // cross | outFirst | inFirst | cut
    camEase: "inout"   // inout | out | in | linear
  },

  /* level 3: the camera move when a solution is picked */
  solutionView: {
    enabled: true,
    frustum: 34,   // used by manual framing. Smaller number = closer
    keepAngle: true,   // keep the angle the user is already looking from
    azimuth: null,   // degrees around the vertical axis
    elevation: null   // degrees above the horizon
  },

  /* sun, sky and exposure */
  lighting: {
    sunAzimuth: 133,
    sunElevation: 72,
    sunIntensity: 1.8,
    skyIntensity: 1.05,
    ambientIntensity: 0.3,
    environmentIntensity: 1,
    exposure: 1.02
  },

  /* the surrounding light and what you see behind the model */
  environment: {
    source: "gradient",   // 'gradient' builds a sky in code, 'image' uses the picture below
    image: "",   // equirectangular picture stored as data
    rotation: 0,
    background: "color",   // 'color' uses colors.skyTop, 'environment' shows the sky
    backgroundColor: "#FAFAFA",   // used when the backdrop is a flat colour
    backdropImage: "",   // a picture used only behind the model
    backgroundBlur: 0.38,
    spread: 1.2,   // how much of the panorama fits across the view
    backgroundIntensity: 1
  },

  /* size, move or turn a whole object from the model, keyed by its name */
  nodeTransforms: {},

  /* extra objects placed in the scene by hand */
  props: [],

  /* extra render passes, off by default because they cost performance */
  post: {
    enabled: false,
    toneMapping: "aces",   // none | linear | reinhard | cineon | aces | agx | neutral
    bloom: 0.08,   // glow strength on bright areas
    bloomThreshold: 0.08,
    bloomRadius: 0.14,
    vignette: 0   // darkens the corners
  },

  /* shadows. quality: 'off' | 'sharp' | 'soft' | 'softer' */
  shadows: {
    quality: "softer",   // 'off' | 'sharp' | 'soft' | 'softer'
    resolution: 1536,   // lower is softer and blockier, higher is crisper
    spread: 1.1,   // how much of the panorama fits across the view
    bias: 0,
    normalBias: 0.55   // raise if shadows stripe flat surfaces, lower if they float
  },

  /* per material overrides, keyed by the material name from Blender */
  materials: {
    "Column Ties": {
      transparent: true
    },
    LOD_04_Building: {
      roughness: 1
    }
  },

  /* animation, placeholder runs until a clip is exported */
  animation: {
    placeholder: "sway",   // 'sway' or 'off'
    placeholderNote: "Placeholder movement. Export an animation clip from Blender and name it below to replace it."
  },

  /* the buildings, copy a block to add another one */
  buildings: [
    {
      id: "one-bloor-west",
      name: "One Bloor West",
      position: [0, 0, 0],
      rotation: 0,
      scale: 1,
      nodes: {
        city: "LOD_04",
        detail: "LOD_00"
      },
      markerHeight: 0.6,   // 0 is the base, 1 is the roof
      view: {
        fit: "solutions",   // 'auto' or 'solutions' or 'building' frame automatically, 'manual' uses the values below
        azimuth: -50,   // degrees around the vertical axis
        elevation: 22,   // degrees above the horizon
        padding: 9,   // used by the automatic framing modes
        frustum: 120,   // used by manual framing. Smaller number = closer
        target: [13, 12, -25]   // the point the camera looks at
      },
      solutions: [
        {
          number: 1,
          node: "Solution_01",   // empty from Blender. Leave position null to follow it
          position: null,
          label: "Corner hangers",
          title: "Corner Hanger Assembly",
          description: "See how the corner hanger carries the suspended floor edge, or open the solution to inspect it in 3D.",
          body: [
            "The corner hanger transfers the load of the suspended perimeter floor back into the primary structure above, so the corner of the building can stay free of a conventional ground bearing column.",
            "Because the assembly is bolted rather than welded on site, it can be installed quickly at height and inspected easily over the life of the building."
          ],
          specs: [
            ["Reference", "PR0603"],
            ["Family", "Hanger connections"],
            ["Role", "Load transfer at corners"]
          ],
          sketchfab: "https://sketchfab.com/3d-models/pr0603-corner-hangers-88699cf541e34e08aefae936a16d531c",
          provider: {
            name: "constructsteel",
            note: "Replace with the company that supplies this solution.",
            url: "https://constructsteel.org/"   // sits next to this HTML file
          },
          detailsUrl: "https://constructsteel.org/steel-solutions/disaster-solutions/prevention-solution/earthquake/",
          animation: {
            clip: "",   // animation clip name from Blender. Empty uses the placeholder
            label: "View the load path"
          }
        },
        {
          number: 2,
          node: "Solution_02",   // empty from Blender. Leave position null to follow it
          position: null,
          label: "RBS connection",
          title: "RBS Beam-to-Column Connection",
          description: "See how the structural element behaves during an earthquake, or open the solution to inspect it in 3D.",
          body: [
            "In a reduced beam section the flanges of the beam are trimmed a short distance away from the column face. During a strong earthquake the beam yields inside that reduced zone instead of at the weld, so the plastic hinge forms where it can be tolerated.",
            "Keeping the hinge away from the column face protects the connection itself, which means the frame can absorb a large amount of energy while the primary load path stays intact."
          ],
          specs: [
            ["Reference", "PR0602"],
            ["Family", "Moment connections"],
            ["Role", "Controlled yielding in seismic frames"]
          ],
          sketchfab: "https://sketchfab.com/3d-models/pr0602-rbs-beam-to-column-6bdb10adbec04453b93f380ae3a036f0",
          provider: {
            name: "constructsteel",
            note: "Replace with the company that supplies this solution.",
            url: "https://constructsteel.org/"   // sits next to this HTML file
          },
          detailsUrl: "https://constructsteel.org/steel-solutions/disaster-solution/prevention-solution/earthquake/reduced-beam-sections-rbs/",
          animation: {
            clip: "",   // animation clip name from Blender. Empty uses the placeholder
            label: "View earthquake response"
          }
        },
        {
          number: 3,
          node: "Solution_03",   // empty from Blender. Leave position null to follow it
          position: null,
          label: "Megacolumn",
          title: "Composite Megacolumn",
          description: "See how the megacolumn carries the tower, or open the solution to inspect it in 3D.",
          body: [
            "The megacolumn gathers the gravity and lateral load of the whole tower into a small number of very large composite sections, which frees the floor plates above from closely spaced columns.",
            "The steel section is designed to work together with its concrete encasement, so the column stays stiff under wind and keeps a predictable reserve of strength during a seismic event."
          ],
          specs: [
            ["Family", "Composite columns"],
            ["Role", "Primary vertical load path"],
            ["Location", "Tower base"]
          ],
          sketchfab: "https://sketchfab.com/3d-models/megacolumn-b069f8b6454f482f881217c9cc0fc67d",
          provider: {
            name: "constructsteel",
            note: "Replace with the company that supplies this solution.",
            url: "https://constructsteel.org/"   // sits next to this HTML file
          },
          detailsUrl: "https://constructsteel.org/steel-solutions/disaster-solutions/prevention-solution/earthquake/",
          animation: {
            clip: "",   // animation clip name from Blender. Empty uses the placeholder
            label: "View the load path"
          }
        }
      ]
    }
  ]
};
/* ===== CONFIG END ======================================================== */


/* ============================================================================
   2. ENGINE
   Nothing below here needs editing for normal content changes.
   ============================================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;
const CAM_DIST = 1400;

const app = $('app'), loading = $('loading'), loadingText = $('loadingText'), loadingBar = $('loadingBar');
const buildingHotspots = $('buildingHotspots'), solutionHotspots = $('solutionHotspots');
const preview = $('preview'), previewKicker = $('previewKicker'), previewTitle = $('previewTitle');
const previewCopy = $('previewCopy'), previewNote = $('previewNote'), previewClose = $('previewClose');
const playBtn = $('playBtn'), exploreBtn = $('exploreBtn');
const backBtn = $('backBtn'), hint = $('hint'), crumbs = $('crumbs'), srStatus = $('srStatus');
const modal = $('viewerModal'), closeViewerBtn = $('closeViewer'), sketchfabFrame = $('sketchfabFrame');
const viewerTitle = $('viewerTitle'), viewerKicker = $('viewerKicker'), viewerBody = $('viewerBody');
const providerName = $('providerName'), providerNote = $('providerNote'), providerLink = $('providerLink');
const detailsLink = $('detailsLink'), specList = $('specList');

/* ---- state ---------------------------------------------------------------- */
let template = null, clips = [], terrain = null;
let buildings = [];                 // runtime objects, one per CONFIG.buildings entry
let level = 'city';                 // 'city' | 'building'
let activeBuilding = null;
let activeSolution = null;
let transition = null;              // {from,to,start,duration}
let frustum = CONFIG.cityView.frustum;
let swayUntil = 0, swayBuilding = null;

/* ---- renderer, scene, camera --------------------------------------------- */
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const TONE_CURVES = {
  none: THREE.NoToneMapping, linear: THREE.LinearToneMapping, reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping, aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping
};
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
app.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .07;
controls.screenSpacePanning = true;

const sky = new THREE.HemisphereLight(0xffffff, 0x8f9a9e, 1.55);
const amb = new THREE.AmbientLight(0xffffff, .35);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
scene.add(sky, amb, sun, sun.target);

const SHADOW_TYPES = {
  sharp: THREE.BasicShadowMap, soft: THREE.PCFShadowMap, softer: THREE.PCFSoftShadowMap
};
function applyLighting() {
  markDirty(500);
  const L = CONFIG.lighting;
  sky.intensity = L.skyIntensity;
  amb.intensity = L.ambientIntensity;
  sun.intensity = L.sunIntensity;
  renderer.toneMappingExposure = L.exposure;
  scene.environmentIntensity = L.environmentIntensity;
  aimSun();
}
function applyShadows() {
  markDirty(500);
  const S = CONFIG.shadows;
  const on = S.quality !== 'off';
  renderer.shadowMap.enabled = on;
  renderer.shadowMap.type = SHADOW_TYPES[S.quality] || THREE.PCFSoftShadowMap;
  sun.castShadow = on;
  sun.shadow.mapSize.set(S.resolution, S.resolution);
  sun.shadow.bias = S.bias;
  sun.shadow.normalBias = S.normalBias;
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  renderer.shadowMap.needsUpdate = true;
  // changing the shadow type means every shader has to be rebuilt
  scene.traverse(o => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true);
  });
  aimSun();
}

/* ---- the surrounding light -----------------------------------------------
   Either a sky built in code, or an equirectangular picture loaded through
   the panel and kept in the settings as data so it travels with the file. */
let envTexture = null;
function disposeEnv() {
  if (envTexture) { envTexture.dispose(); envTexture = null; }
  scene.environment = null;
}
function buildEnvironment() {
  const E = CONFIG.environment;
  if (E.source === 'image' && E.image) {
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      commitEnvironment(tex);
    };
    img.onerror = () => { console.warn('The environment picture could not be read.'); buildGradientEnvironment(); };
    img.src = E.image;
    return;
  }
  buildGradientEnvironment();
}
function commitEnvironment(sourceTex) {
  sourceTex.mapping = THREE.EquirectangularReflectionMapping;
  disposeEnv();
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  envTexture = pmrem.fromEquirectangular(sourceTex).texture;
  pmrem.dispose();
  sourceTex.dispose();
  scene.environment = envTexture;
  scene.environmentIntensity = CONFIG.lighting.environmentIntensity;
  applyBackground();
  markDirty(600);
}
/* The backdrop.
   The camera is orthographic, so every view ray is parallel and a sky sphere
   would collapse into one flat colour. Instead the panorama is drawn on a
   screen filling plane that samples the picture by direction, which is what a
   viewer expects to see behind the model, and pans as the camera orbits.
   `spread` is how much of the panorama fits across the view. */
let skyDome = null, skyTexKey = null;
const SKY_SHADER = {
  uniforms: {
    map: { value: null }, intensity: { value: 1 }, az: { value: 0 }, el: { value: 0 },
    spread: { value: 1.2 }, aspect: { value: 1.6 }, toLinear: { value: 0 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: [
    'uniform sampler2D map; uniform float intensity, az, el, spread, aspect, toLinear;',
    'varying vec2 vUv;',
    'vec3 srgbToLinear(vec3 c){ return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(0.04045, c)); }',
    'void main(){',
    '  vec2 d = vUv - 0.5;',
    '  float lon = az + d.x * spread * aspect;',
    '  float lat = el + d.y * spread;',
    '  vec2 t = vec2(fract(lon/6.28318531 + 0.5), clamp(0.5 - lat/3.14159265, 0.001, 0.999));',
    '  vec3 c = texture2D(map, t).rgb * intensity;',
    '  gl_FragColor = vec4(mix(c, srgbToLinear(c), toLinear), 1.0);',
    '}'
  ].join('\n')
};
function ensureSkyDome() {
  if (skyDome) return skyDome;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(SKY_SHADER.uniforms),
    vertexShader: SKY_SHADER.vertexShader,
    fragmentShader: SKY_SHADER.fragmentShader,
    depthWrite: false, depthTest: false, side: THREE.DoubleSide
  });
  skyDome = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  skyDome.renderOrder = -1000;
  skyDome.frustumCulled = false;
  scene.add(skyDome);
  return skyDome;
}
/* Keeps the backdrop filling the view, and pans it with the camera. */
const _sky = new THREE.Vector3(), _skyOff = new THREE.Vector3();
function updateSky() {
  if (!skyDome || !skyDome.visible) return;
  camera.getWorldDirection(_sky);
  skyDome.quaternion.copy(camera.quaternion);
  skyDome.position.copy(camera.position).addScaledVector(_sky, camera.far * 0.85);
  const w = (camera.right - camera.left) / camera.zoom, h = (camera.top - camera.bottom) / camera.zoom;
  skyDome.scale.set(w * 1.02, h * 1.02, 1);
  const u = skyDome.material.uniforms;
  const off = _skyOff.copy(camera.position).sub(controls.target);
  u.az.value = Math.atan2(off.z, off.x) + Math.PI + (CONFIG.environment.rotation || 0) * DEG;
  u.el.value = Math.asin(THREE.MathUtils.clamp(off.y / (off.length() || 1), -1, 1));
  u.aspect.value = w / h;
  u.spread.value = (CONFIG.environment.spread == null ? 1.2 : CONFIG.environment.spread);
}
function setSkyTexture(url, blur) {
  const key = url.length + '|' + Number(blur).toFixed(2);
  if (skyTexKey === key) return;
  skyTexKey = key;
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d');
    if (blur > 0.002) cx.filter = 'blur(' + Math.max(1, Math.round(blur * w * 0.06)) + 'px)';
    cx.drawImage(img, 0, 0, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.NoColorSpace;   // sampled raw, the shader handles it
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const dome = ensureSkyDome();
    const u = dome.material.uniforms;
    if (u.map.value) u.map.value.dispose();
    u.map.value = tex;
    dome.material.needsUpdate = true;
    markDirty(600);
  };
  img.onerror = () => { skyTexKey = null; };
  img.src = url;
}
function applyBackground() {
  markDirty(500);
  const E = CONFIG.environment;
  scene.background = new THREE.Color(E.backgroundColor || CONFIG.colors.skyTop);
  scene.backgroundBlurriness = 0;
  scene.backgroundIntensity = 1;
  const r = (E.rotation || 0) * DEG;
  if (scene.environmentRotation) scene.environmentRotation.set(0, r, 0);

  // a picture just for the backdrop wins, otherwise the surrounding picture
  const backdropPic = E.backdropImage || ((E.source === 'image') ? E.image : '');
  const wantSky = E.background === 'environment' && !!backdropPic;
  if (!wantSky) { if (skyDome) skyDome.visible = false; return; }
  const dome = ensureSkyDome();
  dome.visible = true;
  dome.material.uniforms.intensity.value = E.backgroundIntensity == null ? 1 : E.backgroundIntensity;
  dome.material.uniforms.toLinear.value = usePost ? 1 : 0;
  setSkyTexture(backdropPic, E.backgroundBlur == null ? 0 : E.backgroundBlur);
  updateSky();
}
function buildGradientEnvironment() {
  const W = 256, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(.34, CONFIG.colors.skyTop);
  g.addColorStop(.5, CONFIG.colors.skyBottom);
  g.addColorStop(.52, '#9c9a92');
  g.addColorStop(1, '#6f6d66');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // a soft sun so glass and steel pick up a highlight
  const sx = W * .62, sy = H * .2, r = H * .30;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(.35, 'rgba(255,253,245,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  commitEnvironment(tex);
}

/* ---- extra render passes -------------------------------------------------
   Loaded only when they are switched on, so a file that does not use them
   downloads nothing extra. */
const VIGNETTE_SHADER = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;' +
    'void main(){ vec4 c=texture2D(tDiffuse,vUv); float d=distance(vUv,vec2(0.5));' +
    'float v=smoothstep(0.85,0.25,d); c.rgb*=mix(1.0,v,amount); gl_FragColor=c; }'
};
const JSM = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/';
let composer = null, bloomPass = null, vignettePass = null, usePost = false, composerLoading = false;
async function ensureComposer() {
  if (composer || composerLoading) return composer;
  composerLoading = true;
  try {
    const [ec, rp, ub, sp, op] = await Promise.all([
      import(JSM + 'postprocessing/EffectComposer.js/+esm'),
      import(JSM + 'postprocessing/RenderPass.js/+esm'),
      import(JSM + 'postprocessing/UnrealBloomPass.js/+esm'),
      import(JSM + 'postprocessing/ShaderPass.js/+esm'),
      import(JSM + 'postprocessing/OutputPass.js/+esm')
    ]);
    composer = new ec.EffectComposer(renderer);
    composer.setSize(viewWidth(), innerHeight);
    bloomPass = new ub.UnrealBloomPass(new THREE.Vector2(viewWidth(), innerHeight), 0, 0.4, 0.85);
    vignettePass = new sp.ShaderPass(VIGNETTE_SHADER);
    composer.addPass(new rp.RenderPass(scene, camera));
    composer.addPass(bloomPass);
    composer.addPass(vignettePass);
    composer.addPass(new op.OutputPass());
  } catch (err) {
    console.error('The extra render passes could not be loaded.', err);
    composer = null;
  }
  composerLoading = false;
  return composer;
}
function recompileAll() {
  scene.traverse(o => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true);
  });
}
function applyPost() {
  const P = CONFIG.post;
  const curve = TONE_CURVES[P.toneMapping];
  renderer.toneMapping = curve === undefined ? THREE.ACESFilmicToneMapping : curve;
  recompileAll();
  if (!P.enabled) { usePost = false; applyBackground(); return; }
  ensureComposer().then(c => {
    if (!c) { usePost = false; return; }
    bloomPass.strength = P.bloom;
    bloomPass.threshold = P.bloomThreshold;
    bloomPass.radius = P.bloomRadius;
    bloomPass.enabled = P.bloom > 0.001;
    vignettePass.uniforms.amount.value = P.vignette;
    vignettePass.enabled = P.vignette > 0.001;
    usePost = true;
    applyBackground();
  });
}

/* ---- helpers -------------------------------------------------------------- */
function applyColors() {
  const c = CONFIG.colors, r = document.documentElement.style;
  r.setProperty('--brand', c.brand); r.setProperty('--brand-dark', c.brandDark); r.setProperty('--paper', c.paper);
  r.setProperty('--sky-top', c.skyTop); r.setProperty('--sky-bottom', c.skyBottom);
  buildEnvironment();
}
function applyText() {
  const t = CONFIG.text;
  $('uiTitle').textContent = t.title; $('uiSubtitle').textContent = t.subtitle;
  document.title = t.title.replace(/·/g, '-');
  backBtn.textContent = t.back; exploreBtn.textContent = t.explore;
  providerLink.textContent = t.provider; detailsLink.textContent = t.details;
  viewerKicker.textContent = t.modalKicker;
  hint.textContent = level === 'city' ? t.hintCity : t.hintBuilding;
}
function viewWidth() { return Math.max(320, innerWidth - (document.body.classList.contains('edit-mode') ? 372 : 0)); }
function resizeRenderer() {
  renderer.setSize(viewWidth(), innerHeight);
  if (composer) { composer.setSize(viewWidth(), innerHeight); if (bloomPass) bloomPass.setSize(viewWidth(), innerHeight); }
  setFrustum(frustum);
}
function setFrustum(f) {
  const a = viewWidth() / innerHeight;
  camera.left = -f * a * .5; camera.right = f * a * .5; camera.top = f * .5; camera.bottom = -f * .5;
  camera.updateProjectionMatrix();
}
function dirFrom(az, el) {
  const a = az * DEG, e = el * DEG;
  return new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)).normalize();
}
function say(msg) { srStatus.textContent = msg; }
function sketchfabId(v) {
  if (!v) return '';
  const m = String(v).match(/([0-9a-f]{32})/i);
  return m ? m[1] : String(v).trim();
}
function eachMaterial(obj, fn) {
  obj.traverse(o => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(fn);
  });
}
function prepareBranch(obj, opts) {
  const forceOpaque = opts && opts.forceOpaque;
  obj.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; }
    if (!o.material) return;
    const map = m => {
      const n = m.clone();
      if (forceOpaque) {
        n.transparent = false; n.opacity = 1; n.depthWrite = true;
        n.side = THREE.FrontSide; n.alphaTest = 0; n.alphaMap = null;
      }
      n.userData._t0 = n.transparent;
      return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(map) : map(o.material);
  });
}
/* The exported ground plane carries no material, so glTF hands us the default
   fully metallic one. Give it something that reads as ground. */
function applyGroundVisibility() {
  if (terrain) terrain.visible = CONFIG.ground.visible !== false;
}
function prepareGround(obj) {
  obj.visible = CONFIG.ground.visible !== false;
  obj.traverse(o => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    o.castShadow = false; o.receiveShadow = true;
    if (CONFIG.ground.useModelMaterial) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m) { m.userData._t0 = m.transparent; }
      return;
    }
    o.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.ground.color),
      roughness: CONFIG.ground.roughness, metalness: 0
    });
    o.material.userData._t0 = false;
  });
}
function setOpacity(obj, v, noDepth) {
  eachMaterial(obj, m => {
    m.opacity = v;
    m.transparent = v < 0.999 ? true : !!m.userData._t0;
    m.depthWrite = noDepth ? false : v > 0.25;
  });
}
function worldBox(obj) { obj.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(obj); }

/* ---- build the city ------------------------------------------------------- */
function buildCity() {
  buildings.forEach(b => scene.remove(b.group));
  buildings = [];
  CONFIG.buildings.forEach((cfg, i) => {
    const group = new THREE.Group();
    group.name = 'building_' + cfg.id;
    // If the named nodes are not in the model, show the whole thing rather
    // than nothing, so a freshly loaded model is visible while it is mapped.
    let srcCity = template.getObjectByName(cfg.nodes.city);
    let srcDetail = template.getObjectByName(cfg.nodes.detail);
    missingNodes = (!srcCity ? [cfg.nodes.city] : []).concat(!srcDetail ? [cfg.nodes.detail] : []);
    if (!srcCity && !srcDetail) { srcCity = template; srcDetail = template; }
    else if (!srcCity) srcCity = srcDetail;
    else if (!srcDetail) srcDetail = srcCity;
    const cityObj = srcCity.clone(true), detailObj = srcDetail.clone(true);
    prepareBranch(cityObj, { forceOpaque: CONFIG.cityShape.forceOpaque });
    prepareBranch(detailObj);
    applyNodeTransform(cityObj, cfg.nodes.city);
    applyNodeTransform(detailObj, cfg.nodes.detail);
    detailObj.visible = false;
    group.add(cityObj, detailObj);
    scene.add(group);

    const b = {
      cfg, index: i, group, cityObj, detailObj,
      mixer: new THREE.AnimationMixer(group), action: null,
      markerEl: null, solutionEls: new Map(), baseX: 0
    };
    applyPlacement(b);
    b.cityBox = worldBox(cityObj);
    b.detailBox = worldBox(detailObj);
    buildings.push(b);
  });
  indexMaterials();
  applyMaterials();
  buildProps();
  aimSun();
}
function applyPlacement(b) {
  markDirty(500);
  const c = b.cfg;
  b.group.position.fromArray(c.position || [0, 0, 0]);
  b.group.rotation.y = (c.rotation || 0) * DEG;
  const s = c.scale == null ? 1 : c.scale;
  b.group.scale.setScalar(s);
  b.baseX = b.group.position.x;
  b.group.updateWorldMatrix(true, true);
  b.cityBox = worldBox(b.cityObj);
  b.detailBox = worldBox(b.detailObj);
}
function aimSun() {
  const box = new THREE.Box3();
  buildings.forEach(b => box.union(b.cityBox));
  if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 60, 0), new THREE.Vector3(120, 120, 120));
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z) * 0.75 + 40;
  sun.position.copy(c).addScaledVector(dirFrom(CONFIG.lighting.sunAzimuth, CONFIG.lighting.sunElevation), r * 3);
  sun.target.position.copy(c);
  sun.target.updateMatrixWorld();
  const half = r * (CONFIG.shadows.spread || 1);
  const cam = sun.shadow.camera;
  cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.near = 1; cam.far = r * 7;
  cam.updateProjectionMatrix();
}
const fitShadow = aimSun;

/* ---- material registry ---------------------------------------------------
   Every material in the model is indexed by its Blender name so the edit
   panel can change all copies of it at once. The values the model shipped
   with are remembered, so any override can be undone. */
let materialIndex = new Map();
let missingNodes = [];
function indexMaterials() {
  materialIndex = new Map();
  buildings.forEach(b => [b.cityObj, b.detailObj].forEach(root => {
    root.traverse(o => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        const n = m.name || '(unnamed)';
        if (!materialIndex.has(n)) materialIndex.set(n, []);
        materialIndex.get(n).push(m);
      });
    });
  }));
}
function applyMaterials() {
  markDirty(500);
  materialIndex.forEach((list, name) => {
    const over = CONFIG.materials[name] || {};
    list.forEach(m => {
      if (!m.userData._base) m.userData._base = {
        color: m.color ? '#' + m.color.getHexString() : null,
        roughness: m.roughness, metalness: m.metalness,
        opacity: m.opacity, transparent: m.transparent, side: m.side,
        emissive: m.emissive ? '#' + m.emissive.getHexString() : null,
        emissiveIntensity: m.emissiveIntensity,
        normalScale: m.normalScale ? m.normalScale.x : 1,
        aoMapIntensity: m.aoMapIntensity,
        maps: { map: m.map || null, normalMap: m.normalMap || null }
      };
      const base = m.userData._base;
      if (m.color) m.color.set(over.color != null ? over.color : (base.color || '#ffffff'));
      if (m.roughness !== undefined) m.roughness = over.roughness != null ? over.roughness : base.roughness;
      if (m.metalness !== undefined) m.metalness = over.metalness != null ? over.metalness : base.metalness;
      m.opacity = over.opacity != null ? over.opacity : base.opacity;
      m.transparent = over.transparent != null ? over.transparent : base.transparent;
      m.side = over.doubleSided != null ? (over.doubleSided ? THREE.DoubleSide : THREE.FrontSide) : base.side;
      if (m.emissive) m.emissive.set(over.emissive != null ? over.emissive : (base.emissive || '#000000'));
      if (m.emissiveIntensity !== undefined)
        m.emissiveIntensity = over.emissiveIntensity != null ? over.emissiveIntensity : (base.emissiveIntensity == null ? 1 : base.emissiveIntensity);
      if (m.normalScale)
        m.normalScale.setScalar(over.normalScale != null ? over.normalScale : (base.normalScale == null ? 1 : base.normalScale));
      if (m.aoMapIntensity !== undefined)
        m.aoMapIntensity = over.aoMapIntensity != null ? over.aoMapIntensity : (base.aoMapIntensity == null ? 1 : base.aoMapIntensity);
      m.userData._t0 = m.transparent;
      TEX_SLOTS.forEach(slot => {
        const url = over[slot] || null;
        if (m.userData['_url_' + slot] === url) return;
        m.userData['_url_' + slot] = url;
        m[slot] = url ? replacementTexture(url, slot === 'map', base.maps[slot]) : base.maps[slot];
      });
      m.needsUpdate = true;
    });
  });
}

/* ---- replacement textures ------------------------------------------------
   Images are stored in the settings as data URLs, so a replaced texture
   travels with the saved HTML file and needs no separate image file. */
const TEX_SLOTS = ['map', 'normalMap'];
const texCache = new Map();
function replacementTexture(url, srgb, proto) {
  const key = (srgb ? 's|' : 'l|') + url.length + '|' + url.slice(30, 90);
  if (texCache.has(key)) return texCache.get(key);
  const tex = new THREE.TextureLoader().load(url, () => markDirty(600));
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.flipY = false;                 // glTF convention
  if (proto) {
    tex.wrapS = proto.wrapS; tex.wrapT = proto.wrapT;
    tex.repeat.copy(proto.repeat); tex.offset.copy(proto.offset);
    if (proto.channel !== undefined) tex.channel = proto.channel;
  } else { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
  texCache.set(key, tex);
  return tex;
}
/* ---- swapping the 3D model ----------------------------------------------
   The bytes are kept so that saving can write them into the file. */
let pendingModelB64 = null;
let pendingExport = null;     // set when a .gltf needs repacking into a .glb at save time
let pendingFiles = null;      // the files that .gltf came with
function bytesToBase64(buf) {
  const bytes = new Uint8Array(buf); let out = ''; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(out);
}
/* A .glb is one self contained file. A .gltf is only the description: the
   geometry sits in a .bin and the textures are separate images beside it. So
   the picker takes several files, or a whole folder, and every relative path
   inside the .gltf is redirected to the matching file the user chose. */
function indexPickedFiles(files) {
  const list = Array.from(files || []);
  const byName = new Map();
  list.forEach(f => {
    const rel = f.webkitRelativePath || f.name;
    byName.set(rel, f);
    byName.set(rel.split('/').pop(), f);
    byName.set(decodeURIComponent(rel.split('/').pop()), f);
  });
  const entry = list.find(f => /\.glb$/i.test(f.name)) || list.find(f => /\.gltf$/i.test(f.name));
  return { list, byName, entry };
}
function loadModelFiles(files) {
  const { list, byName, entry } = indexPickedFiles(files);
  if (!entry) return Promise.reject(new Error('No .glb or .gltf among those files.'));
  const isGlb = /\.glb$/i.test(entry.name);
  const made = [];
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (/^data:/i.test(url)) return url;
    const clean = url.split('?')[0].split('#')[0];
    const base = decodeURIComponent(clean.split('/').pop() || '');
    const f = byName.get(base);
    if (!f) return url;
    const u = URL.createObjectURL(f);
    made.push(u);
    return u;
  });
  return entry.arrayBuffer().then(async buf => {
    const gl = await attachDecoders(new GLTFLoader(manager));
    return new Promise((resolve, reject) => {
      const rootUrl = URL.createObjectURL(new Blob([buf]));
      made.push(rootUrl);
      gl.load(rootUrl,
        g => {
          made.forEach(u => URL.revokeObjectURL(u));
          resolve({ gltf: g, buf: isGlb ? buf : null, name: entry.name, count: list.length, entry, byName });
        },
        undefined,
        e => { made.forEach(u => URL.revokeObjectURL(u)); reject(e); });
    });
  });
}
/* A .gltf and its companion files cannot be pasted into the HTML as they are,
   so they are repacked into a single .glb. This copies the existing bytes and
   re-encodes nothing, so quality and file size are exactly what came out of
   Blender. Re-exporting through three's exporter would rewrite every texture
   as PNG, which on this model turns 3.4 MB into tens of megabytes. */
const IMAGE_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  ktx2: 'image/ktx2', basis: 'image/basis', avif: 'image/avif'
};
function align4(n) { return n + ((4 - (n % 4)) % 4); }
async function bytesForUri(uri, byName) {
  if (/^data:/i.test(uri)) {
    const b64 = uri.slice(uri.indexOf(',') + 1);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const base = decodeURIComponent(uri.split('?')[0].split('#')[0].split('/').pop());
  const f = byName.get(base);
  if (!f) throw new Error('Missing file: ' + base);
  return new Uint8Array(await f.arrayBuffer());
}
async function repackGltfToGlb(entry, byName) {
  const json = JSON.parse(await entry.text());
  const parts = []; let offset = 0;
  const put = bytes => {
    const at = offset;
    parts.push(bytes);
    offset += bytes.byteLength;
    const pad = align4(offset) - offset;
    if (pad) { parts.push(new Uint8Array(pad)); offset += pad; }
    return at;
  };
  // every existing buffer becomes one region of the single binary chunk
  const bases = [];
  for (const buf of (json.buffers || [])) {
    if (buf.uri) bases.push(put(await bytesForUri(buf.uri, byName)));
    else bases.push(0);                       // already the binary chunk of a glb
  }
  (json.bufferViews || []).forEach(bv => {
    bv.byteOffset = (bases[bv.buffer] || 0) + (bv.byteOffset || 0);
    bv.buffer = 0;
  });
  // every image file becomes a buffer view of its own
  json.bufferViews = json.bufferViews || [];
  for (const img of (json.images || [])) {
    if (!img.uri) continue;
    const ext = (img.uri.split('.').pop() || '').toLowerCase().split(/[?#]/)[0];
    const bytes = await bytesForUri(img.uri, byName);
    const at = put(bytes);
    json.bufferViews.push({ buffer: 0, byteOffset: at, byteLength: bytes.byteLength });
    img.bufferView = json.bufferViews.length - 1;
    img.mimeType = img.mimeType || IMAGE_TYPES[ext] || 'image/png';
    delete img.uri;
  }
  json.buffers = [{ byteLength: offset }];

  const bin = new Uint8Array(offset);
  let at = 0;
  parts.forEach(part => { bin.set(part, at); at += part.byteLength; });

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = align4(jsonBytes.length) - jsonBytes.length;
  const jsonChunk = new Uint8Array(jsonBytes.length + jsonPad);
  jsonChunk.set(jsonBytes, 0);
  jsonChunk.fill(0x20, jsonBytes.length);      // JSON pads with spaces
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true);            // 'glTF'
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonChunk.length, true);
  dv.setUint32(16, 0x4E4F534A, true);           // 'JSON'
  u8.set(jsonChunk, 20);
  const binAt = 20 + jsonChunk.length;
  dv.setUint32(binAt, bin.length, true);
  dv.setUint32(binAt + 4, 0x004E4942, true);      // 'BIN'
  u8.set(bin, binAt + 8);
  return out;
}
/* Last resort if the repack cannot cope with the file. */
async function templateAsGlb() {
  const mod = await import(JSM + 'exporters/GLTFExporter.js/+esm');
  const buf = await new Promise((resolve, reject) => {
    new mod.GLTFExporter().parse(template, resolve, reject,
      { binary: true, animations: clips, embedImages: true });
  });
  return buf instanceof ArrayBuffer ? buf : new TextEncoder().encode(JSON.stringify(buf)).buffer;
}
function adoptModel(gltf, buf, needsExport) {
  warmed = false;
  template = gltf.scene;
  clips = gltf.animations || [];
  if (buf) { pendingModelB64 = bytesToBase64(buf); pendingExport = null; }
  else if (needsExport) { pendingModelB64 = null; pendingExport = true; }
  attachTerrain();
  rebuild();
  applyLighting();
  applyShadows();
}
function modelNodeNames() {
  const out = [];
  if (template) template.traverse(o => { if (o.name) out.push(o.name); });
  return [...new Set(out)].sort();
}

/* ---- turning a picked HDRI into something the file can carry ------------- */
function floatEquirectToDataUrl(parsed, maxSize) {
  const w = parsed.width, h = parsed.height, data = parsed.data;
  const enc = v => {
    const t = v / (1 + v);                                   // Reinhard, keeps highlights in range
    const s = t <= 0.0031308 ? t * 12.92 : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(s * 255)));
  };
  const full = document.createElement('canvas'); full.width = w; full.height = h;
  const fx = full.getContext('2d');
  const id = fx.createImageData(w, h);
  for (let i = 0, p = 0; i < w * h; i++) {
    id.data[p++] = enc(data[i * 4]); id.data[p++] = enc(data[i * 4 + 1]);
    id.data[p++] = enc(data[i * 4 + 2]); id.data[p++] = 255;
  }
  fx.putImageData(id, 0, 0);
  const sc = Math.min(1, maxSize / Math.max(w, h));
  const dw = Math.max(2, Math.round(w * sc)), dh = Math.max(1, Math.round(h * sc));
  const out = document.createElement('canvas'); out.width = dw; out.height = dh;
  out.getContext('2d').drawImage(full, 0, 0, dw, dh);
  let url = out.toDataURL('image/webp', 0.9);
  if (url.indexOf('data:image/webp') !== 0) url = out.toDataURL('image/jpeg', 0.92);
  return { url, w: dw, h: dh };
}
async function environmentFileToDataUrl(file, maxSize) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.hdr')) {
    // three renamed this loader; try the current name first, then the old one
    let loader = null;
    try {
      const mod = await import(JSM + 'loaders/HDRLoader.js/+esm');
      loader = new mod.HDRLoader();
    } catch (e) {
      const mod = await import(JSM + 'loaders/RGBELoader.js/+esm');
      loader = new mod.RGBELoader();
    }
    if (loader.setDataType) loader.setDataType(THREE.FloatType);
    const parsed = loader.parse(await file.arrayBuffer());
    return floatEquirectToDataUrl(parsed, maxSize);
  }
  if (name.endsWith('.exr')) throw new Error('EXR is not supported. Please use .hdr, or a jpg or png panorama.');
  return imageToDataUrl(file, maxSize);
}

/* Re-encodes a picked image so the file does not grow out of hand. */
function imageToDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('that file is not an image'));
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, maxSize / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = c.toDataURL('image/webp', 0.85);
        if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/jpeg', 0.88);
        resolve({ url: out, w, h });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---- sizing and placing a whole object ----------------------------------
   The exported transform is remembered the first time an object is touched,
   so an override can always be undone and scale can multiply rather than
   replace what came out of Blender. */
function applyNodeTransform(obj, name) {
  if (!obj) return;
  if (!obj.userData._trs0) {
    obj.userData._trs0 = { p: obj.position.clone(), r: obj.rotation.clone(), s: obj.scale.clone() };
  }
  const base = obj.userData._trs0;
  const t = (CONFIG.nodeTransforms || {})[name];
  obj.position.copy(base.p);
  obj.rotation.copy(base.r);
  obj.scale.copy(base.s);
  if (t) {
    if (t.scale != null) obj.scale.multiplyScalar(t.scale);
    if (t.position) obj.position.set(base.p.x + (t.position[0] || 0), base.p.y + (t.position[1] || 0), base.p.z + (t.position[2] || 0));
    if (t.rotation) obj.rotation.set(base.r.x + (t.rotation[0] || 0) * DEG, base.r.y + (t.rotation[1] || 0) * DEG, base.r.z + (t.rotation[2] || 0) * DEG);
  }
  obj.updateMatrixWorld(true);
}
function applyAllNodeTransforms() {
  buildings.forEach(b => {
    applyNodeTransform(b.cityObj, b.cfg.nodes.city);
    applyNodeTransform(b.detailObj, b.cfg.nodes.detail);
    b.group.updateMatrixWorld(true);
    b.cityBox = worldBox(b.cityObj);
    b.detailBox = worldBox(b.detailObj);
    if (b.nodeCache) b.nodeCache.clear();
  });
  if (terrain) applyNodeTransform(terrain, CONFIG.model.terrainNode);
  aimSun();
  markDirty(500);
}
/* One place that builds the ground, so every path agrees. */
function attachTerrain() {
  if (terrain) { scene.remove(terrain); terrain = null; }
  const name = CONFIG.model.terrainNode;
  const src = (name && template) ? template.getObjectByName(name) : null;
  if (!src) return;
  terrain = src.clone(true);
  prepareGround(terrain);
  applyNodeTransform(terrain, name);
  scene.add(terrain);
  markDirty(400);
}

/* ---- extra objects ------------------------------------------------------
   Either a plane or a box built in code, or a copy of any object from the
   loaded model, placed wherever you like. */
let propObjects = [];
function buildProps() {
  propObjects.forEach(o => scene.remove(o));
  propObjects = [];
  (CONFIG.props || []).forEach(cfg => {
    let obj = null;
    if (cfg.node && template) {
      const src = template.getObjectByName(cfg.node);
      if (src) { obj = src.clone(true); prepareBranch(obj); }
    }
    if (!obj) {
      const geo = cfg.shape === 'box' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cfg.color || '#B9C4CC'),
        roughness: cfg.roughness == null ? 0.85 : cfg.roughness,
        metalness: 0,
        side: THREE.DoubleSide
      });
      obj = new THREE.Mesh(geo, mat);
      if (cfg.shape !== 'box') obj.rotation.x = -Math.PI / 2;   // a plane lies flat
      obj.userData._built = true;
    }
    obj.name = 'prop_' + (cfg.id || propObjects.length);
    const g = new THREE.Group();
    g.add(obj);
    g.position.fromArray(cfg.position || [0, 0, 0]);
    g.rotation.set((cfg.rotation && cfg.rotation[0] || 0) * DEG,
      (cfg.rotation && cfg.rotation[1] || 0) * DEG,
      (cfg.rotation && cfg.rotation[2] || 0) * DEG);
    const sc = cfg.scale == null ? 1 : cfg.scale;
    g.scale.setScalar(sc);
    if (obj.userData._built && cfg.shape !== 'box') g.scale.set(sc, sc, sc);
    g.traverse(o => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = cfg.shadow !== false; o.receiveShadow = true; } });
    scene.add(g);
    propObjects.push(g);
  });
  markDirty(500);
}

/* ---- warming up ----------------------------------------------------------
   The open structure is built at load time but never drawn until the user
   enters a building. Without this, its shaders compile and its textures upload
   on the very first frame of the dissolve, which stalls exactly when the fade
   is supposed to be smooth and makes the whole thing look like a jump cut. */
let warmed = false;
/* A texture is only sent to the graphics card the first time something using
   it is actually drawn, and there is no public way to force that on its own:
   renderer.initTexture was removed from three. So the warm up draws one real
   frame with both levels visible, which uploads every texture and compiles
   every shader, then puts the visibility back and draws the correct frame.
   Both happen in the same step, so the browser only ever shows the second one
   and nothing flickers. */
function prewarm() {
  if (!buildings.length || !renderer) return;
  const was = buildings.map(b => [b.cityObj.visible, b.detailObj.visible]);
  const wasTerrain = terrain ? terrain.visible : null;
  const wasSky = skyDome ? skyDome.visible : null;
  try {
    buildings.forEach(b => { b.cityObj.visible = true; b.detailObj.visible = true; });
    if (terrain) terrain.visible = true;

    // Pass one: solid, which is how both levels sit at rest. This uploads
    // every texture and compiles the ordinary shaders.
    buildings.forEach(b => { setOpacity(b.cityObj, 1); setOpacity(b.detailObj, 1); });
    renderer.render(scene, camera);

    // Pass two: half transparent, which is how they sit mid dissolve. three
    // keeps `opaque` in its shader cache key, so a see through material needs
    // a different shader from a solid one. Without this pass all of those
    // compile during the fade, which is what made it stutter and show the
    // untextured mesh.
    buildings.forEach(b => { setOpacity(b.cityObj, 0.5, true); setOpacity(b.detailObj, 0.5, true); });
    renderer.render(scene, camera);

    buildings.forEach(b => { setOpacity(b.cityObj, 1); setOpacity(b.detailObj, 1); });
  } catch (err) {
    console.warn('Warm up render skipped.', err);
  } finally {
    buildings.forEach((b, i) => { b.cityObj.visible = was[i][0]; b.detailObj.visible = was[i][1]; });
    if (terrain && wasTerrain !== null) terrain.visible = wasTerrain;
    if (skyDome && wasSky !== null) skyDome.visible = wasSky;
    warmed = true;
  }
  try { renderer.render(scene, camera); } catch (err) { }
  markDirty(400);
  // compiling ahead of time as well costs nothing and covers any variant the
  // one warm frame did not happen to hit
  if (renderer.compileAsync) {
    renderer.compileAsync(scene, camera).then(() => markDirty(200), () => { });
  }
}

/* ---- solution positions --------------------------------------------------- */
/* Scratch vectors, reused every frame. Allocating inside the frame loop makes
   the browser collect garbage while the user is orbiting. */
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
/* Resolving an empty by name walks the object tree, so the result is cached
   per solution and only looked up again if the name changes. */
function solutionNode(b, sol) {
  if (!sol.node) return null;
  if (!b.nodeCache) b.nodeCache = new Map();
  const hit = b.nodeCache.get(sol);
  if (hit && hit.name === sol.node) return hit.node;
  const node = b.detailObj.getObjectByName(sol.node) || null;
  b.nodeCache.set(sol, { name: sol.node, node });
  return node;
}
function solutionLocal(b, sol, out) {
  const o = out || _v;
  if (Array.isArray(sol.position)) return o.fromArray(sol.position);
  const node = solutionNode(b, sol);
  if (node) {
    node.updateWorldMatrix(true, false);
    node.getWorldPosition(o);
    return b.group.worldToLocal(o);
  }
  return b.detailBox.getCenter(o).sub(b.group.position);
}
function solutionWorld(b, sol, out) {
  const o = out || _v;
  solutionLocal(b, sol, o);
  return b.group.localToWorld(o);
}

/* ---- camera views --------------------------------------------------------- */
function cityFraming() {
  const v = CONFIG.cityView;
  if (v.fit === 'auto' && buildings.length) {
    const box = new THREE.Box3();
    buildings.forEach(b => box.union(b.cityBox));
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    return { target: c, frustum: Math.max(Math.max(s.x, s.y, s.z) * (v.padding || 1.25), 40), az: v.azimuth, el: v.elevation };
  }
  return { target: new THREE.Vector3().fromArray(v.target), frustum: v.frustum, az: v.azimuth, el: v.elevation };
}
function buildingFraming(b) {
  const v = b.cfg.view;
  if (v.fit === 'manual') {
    return { target: new THREE.Vector3().fromArray(v.target), frustum: v.frustum, az: v.azimuth, el: v.elevation };
  }
  let box;
  if (v.fit === 'solutions' && b.cfg.solutions.length) {
    box = new THREE.Box3();
    b.cfg.solutions.forEach(s => box.expandByPoint(solutionWorld(b, s)));
  } else {
    box = b.detailBox.clone();
  }
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const pad = v.padding || 6;
  const f = Math.max(Math.max(s.x, s.y, s.z) * pad, 24);
  return { target: c, frustum: f, az: v.azimuth, el: v.elevation };
}
function camStateFor(fr) {
  return {
    pos: fr.target.clone().add(dirFrom(fr.az, fr.el).multiplyScalar(CAM_DIST)),
    target: fr.target.clone(), frustum: fr.frustum, zoom: 1
  };
}
function currentCamState() {
  return { pos: camera.position.clone(), target: controls.target.clone(), frustum, zoom: camera.zoom };
}
function applyCamState(s) {
  camera.position.copy(s.pos); controls.target.copy(s.target);
  frustum = s.frustum; camera.zoom = s.zoom; setFrustum(frustum);
  controls.update();
}
function startTransition(to, duration, opts) {
  markDirty(300);
  transition = Object.assign(
    { from: currentCamState(), to, start: performance.now(), duration: duration || 1150 },
    opts || {});
  controls.enabled = false;
}
function cityControls() {
  controls.enabled = true; controls.enableRotate = false; controls.enablePan = true; controls.enableZoom = true;
  controls.minZoom = .5; controls.maxZoom = 4;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  renderer.domElement.style.cursor = 'grab';
}
function buildingControls() {
  const o = CONFIG.orbit;
  controls.enabled = true; controls.enableRotate = true; controls.enablePan = true; controls.enableZoom = true;
  if (o.free) {
    controls.minPolarAngle = 0.001; controls.maxPolarAngle = Math.PI - 0.001;
    controls.minZoom = 0.02; controls.maxZoom = 80;
  } else if (focused) {
    // A stored solution view is deliberate, so while it is open the limits are
    // opened up. Otherwise a view authored from below would be snapped back.
    controls.minPolarAngle = 0.001; controls.maxPolarAngle = Math.PI - 0.001;
    controls.minZoom = Math.min(0.08, o.zoomMin); controls.maxZoom = Math.max(o.zoomMax, 30);
  } else {
    controls.minPolarAngle = Math.max(0.001, (90 - o.polarMax) * DEG);
    controls.maxPolarAngle = Math.min(Math.PI - 0.001, (90 - o.polarMin) * DEG);
    controls.minZoom = o.zoomMin;
    controls.maxZoom = o.zoomMax;
  }
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  renderer.domElement.style.cursor = 'grab';
}

/* ---- level 1 -------------------------------------------------------------- */
function goCity(animated = true) {
  const from = activeBuilding;
  level = 'city'; activeBuilding = null; focused = false;
  preview.classList.remove('visible'); activeSolution = null;
  stopAnimation();
  buildings.forEach(b => { b.group.position.x = b.baseX; b.cityObj.visible = true; });
  const to = camStateFor(cityFraming());

  if (animated && from) {
    // the same dissolve as going in, run the other way round
    buildings.forEach(b => { if (b !== from) { b.detailObj.visible = false; setOpacity(b.cityObj, 1); } });
    from.detailObj.visible = true;
    setOpacity(from.detailObj, 1, true);
    setOpacity(from.cityObj, 0, true);
    startTransition(to, CONFIG.transitions.toCity,
      { fadeOut: from.detailObj, fadeIn: from.cityObj, onDone: finishCityView });
  } else {
    buildings.forEach(b => { b.detailObj.visible = false; setOpacity(b.cityObj, 1); setOpacity(b.detailObj, 1); });
    if (animated) startTransition(to, CONFIG.transitions.toCity, { onDone: finishCityView });
    else { applyCamState(to); finishCityView(); }
  }
  backBtn.hidden = true;
  hint.textContent = CONFIG.text.hintCity; hint.style.opacity = '1';
  renderCrumbs(); say('City view. ' + CONFIG.text.hintCity + '.');
}
function finishCityView() {
  buildings.forEach(b => {
    b.cityObj.visible = true; b.detailObj.visible = false;
    setOpacity(b.cityObj, 1); setOpacity(b.detailObj, 1);
  });
  cityControls();
  hint.textContent = CONFIG.text.hintCity; hint.style.opacity = '1';
}

/* ---- level 2 -------------------------------------------------------------- */
function goBuilding(b, animated = true) {
  if (!b) return;
  level = 'building'; activeBuilding = b; focused = false;
  preview.classList.remove('visible'); activeSolution = null;
  buildings.forEach(o => {
    const on = o === b;
    o.cityObj.visible = true; o.detailObj.visible = on;
    if (!on) { setOpacity(o.cityObj, 1); setOpacity(o.detailObj, 1); }
  });
  const to = camStateFor(buildingFraming(b));
  if (animated) {
    // the closed volume goes from solid to fully transparent while the open
    // structure comes the other way, both on the same curve so the total
    // never dips and the building never appears to vanish
    if (!warmed) prewarm();
    setOpacity(b.cityObj, 1, true);
    setOpacity(b.detailObj, 0, true);
    startTransition(to, CONFIG.transitions.toBuilding,
      { fadeOut: b.cityObj, fadeIn: b.detailObj, onDone: finishEnterBuilding });
  }
  else { applyCamState(to); finishEnterBuilding(); }
  backBtn.hidden = false;
  hint.textContent = 'Opening building'; hint.style.opacity = '1';
  renderCrumbs();
}
function finishEnterBuilding() {
  buildings.forEach(o => {
    const on = o === activeBuilding;
    o.cityObj.visible = !on;
    o.detailObj.visible = on;
    setOpacity(o.detailObj, 1);
    setOpacity(o.cityObj, 1);
  });
  buildingControls();
  hint.textContent = CONFIG.text.hintBuilding; hint.style.opacity = '1';
  say(activeBuilding.cfg.name + '. ' + CONFIG.text.hintBuilding + '.');
}
function renderCrumbs() {
  const parts = ['<b>City</b>'];
  if (activeBuilding) parts.push('<span>›</span>' + (level === 'building' ? '<b>' + activeBuilding.cfg.name + '</b>' : activeBuilding.cfg.name));
  if (activeSolution && modal.classList.contains('open')) parts.push('<span>›</span><b>' + activeSolution.title + '</b>');
  crumbs.innerHTML = parts.join(' ');
}

/* ---- markers -------------------------------------------------------------- */
function makeHotspot(number, label, cls) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'hotspot ' + cls;
  btn.innerHTML = '<span class="ring" aria-hidden="true"></span><span aria-hidden="true">' + number + '</span>' +
    '<span class="label">' + label + '</span>';
  return btn;
}
function buildMarkers() {
  markDirty(500);
  buildingHotspots.replaceChildren(); solutionHotspots.replaceChildren();
  buildings.forEach(b => {
    const el = makeHotspot(b.index + 1, b.cfg.name, 'building-hotspot');
    el.setAttribute('aria-label', 'Explore ' + b.cfg.name);
    el.addEventListener('click', () => { if (level === 'city' && !transition) goBuilding(b); });
    buildingHotspots.appendChild(el);
    b.markerEl = el;

    b.solutionEls.clear();
    b.cfg.solutions.forEach(sol => {
      const s = makeHotspot(sol.number, sol.label || sol.title, 'solution-hotspot');
      s.setAttribute('aria-label', 'Open ' + sol.title);
      s.addEventListener('click', () => { if (!editor.dragging) selectSolution(b, sol); });
      attachDrag(s, b, sol);
      solutionHotspots.appendChild(s);
      b.solutionEls.set(sol, s);
    });
  });
}
const _p = new THREE.Vector3();
function syncCameraMatrices() {
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}
function project(world) {
  const p = _p.copy(world).project(camera);
  if (p.z < -1 || p.z > 1) return null;
  return { x: (p.x * .5 + .5) * renderer.domElement.clientWidth, y: (-p.y * .5 + .5) * renderer.domElement.clientHeight };
}
function placeEl(el, world) {
  const p = project(world);
  if (!p) { el.style.display = 'none'; return false; }
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.transform = 'translate(-50%,-50%)'; el.style.display = 'flex';
  return true;
}
function markerWorld(b, out) {
  const box = b.cityBox, h = b.cfg.markerHeight == null ? .6 : b.cfg.markerHeight;
  const o = out || _v2;
  box.getCenter(o);
  o.y = box.min.y + (box.max.y - box.min.y) * h;
  return o;
}
function updateMarkers() {
  syncCameraMatrices();
  const blocked = (transition && !transition.keepMarkers) || modal.classList.contains('open');
  buildings.forEach(b => {
    if (b.markerEl) {
      if (level !== 'city' || blocked) b.markerEl.style.display = 'none';
      else placeEl(b.markerEl, markerWorld(b, _v2));
    }
    b.solutionEls.forEach((el, sol) => {
      if (level !== 'building' || b !== activeBuilding || blocked || swayUntil > performance.now()) { el.style.display = 'none'; return; }
      placeEl(el, solutionWorld(b, sol, _v3));
      el.classList.toggle('active', activeSolution === sol);
    });
  });
  if (activeSolution && activeBuilding && preview.classList.contains('visible')) placePreview();
}

/* ---- zoom onto a solution ------------------------------------------------- */
let focused = false;
const _ang = new THREE.Vector3();
function camAngles() {
  const d = _ang.copy(camera.position).sub(controls.target);
  return {
    az: Math.atan2(d.z, d.x) / DEG,
    el: Math.asin(THREE.MathUtils.clamp(d.y / (d.length() || 1), -1, 1)) / DEG
  };
}
function focusSolution(b, sol) {
  const sv = CONFIG.solutionView;
  if (!sv.enabled) return;
  const own = sol.view || {};
  const now = camAngles();
  const az = own.azimuth != null ? own.azimuth : (sv.keepAngle ? now.az : (sv.azimuth != null ? sv.azimuth : b.cfg.view.azimuth));
  const el = own.elevation != null ? own.elevation : (sv.keepAngle ? now.el : (sv.elevation != null ? sv.elevation : b.cfg.view.elevation));
  const fr = own.frustum != null ? own.frustum : sv.frustum;
  // A solution can carry its own look-at point, so the marker does not have to
  // sit dead centre. Stored in the building's own space, so it survives the
  // building being moved or rotated.
  const w = Array.isArray(own.target)
    ? b.group.localToWorld(new THREE.Vector3().fromArray(own.target))
    : solutionWorld(b, sol);
  focused = true;
  // let the user pull back out further than the building view normally allows
  controls.minZoom = 0.12;
  startTransition({ pos: w.clone().add(dirFrom(az, el).multiplyScalar(CAM_DIST)), target: w.clone(), frustum: fr, zoom: 1 },
    CONFIG.transitions.toSolution, { keepMarkers: true, onDone: buildingControls });
}
function unfocusSolution() {
  if (!focused || !activeBuilding) return;
  focused = false;
  startTransition(camStateFor(buildingFraming(activeBuilding)),
    CONFIG.transitions.toSolution, { keepMarkers: true, onDone: buildingControls });
}

/* ---- solution preview card ------------------------------------------------ */
function selectSolution(b, sol) {
  activeSolution = sol;
  previewKicker.textContent = 'Solution ' + String(sol.number).padStart(2, '0');
  previewTitle.textContent = sol.title;
  previewCopy.textContent = sol.description || '';
  const clip = sol.animation && sol.animation.clip ? clips.find(c => c.name === sol.animation.clip) : null;
  const canPlaceholder = CONFIG.animation.placeholder === 'sway';
  playBtn.disabled = !clip && !canPlaceholder;
  playBtn.title = sol.animation && sol.animation.label ? sol.animation.label : 'Play animation';
  playBtn.setAttribute('aria-label', playBtn.title);
  previewNote.textContent = (!clip && canPlaceholder) ? CONFIG.animation.placeholderNote : '';
  preview.classList.add('visible');
  hint.style.opacity = '0';
  focusSolution(b, sol);
  placePreview();
  renderCrumbs();
  say(sol.title + ' selected.');
  if (window.editorSyncSolution) window.editorSyncSolution(sol);
}
function placePreview() {
  const p = project(solutionWorld(activeBuilding, activeSolution, _v3));
  if (!p) { preview.style.opacity = '0'; return; }
  preview.style.opacity = '';
  const w = preview.offsetWidth || 330, h = preview.offsetHeight || 210;
  const panel = document.body.classList.contains('edit-mode') ? 372 : 0;
  let x = p.x + 28, y = p.y - h * .42;
  if (x + w > innerWidth - panel - 16) x = p.x - w - 28;
  x = Math.max(16, Math.min(x, innerWidth - panel - w - 16));
  y = Math.max(84, Math.min(y, innerHeight - h - 16));
  preview.style.left = x + 'px'; preview.style.top = y + 'px';
}
function hidePreview() {
  preview.classList.remove('visible'); activeSolution = null;
  if (level === 'building') {
    hint.textContent = CONFIG.text.hintBuilding; hint.style.opacity = '1';
    unfocusSolution();
  }
  renderCrumbs();
}

/* ---- animation ------------------------------------------------------------ */
function stopAnimation() {
  buildings.forEach(b => { b.mixer.stopAllAction(); b.action = null; b.group.position.x = b.baseX; });
  swayUntil = 0; swayBuilding = null;
  playBtn.classList.remove('is-stop');
  playBtn.innerHTML = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M0 0l12 7-12 7z"/></svg>';
}
function playAnimation() {
  if (!activeSolution || !activeBuilding) return;
  if (swayUntil > performance.now() || (activeBuilding.action && activeBuilding.action.isRunning())) { stopAnimation(); return; }
  const name = activeSolution.animation && activeSolution.animation.clip;
  const clip = name ? clips.find(c => c.name === name) : null;
  playBtn.classList.add('is-stop');
  playBtn.innerHTML = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M0 1h4v12H0zM8 1h4v12H8z"/></svg>';
  if (clip) {
    const a = activeBuilding.mixer.clipAction(clip);
    activeBuilding.mixer.stopAllAction();
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
    activeBuilding.action = a;
    say('Playing ' + clip.name + '.');
  } else if (CONFIG.animation.placeholder === 'sway') {
    swayBuilding = activeBuilding; swayUntil = performance.now() + 4200;
    say('Playing placeholder movement.');
  }
}

/* ---- level 3 modal -------------------------------------------------------- */
function openViewer() {
  if (!activeSolution) return;
  const s = activeSolution;
  viewerTitle.textContent = s.title;
  viewerBody.innerHTML = (s.body || []).map(p => '<p>' + p + '</p>').join('') || '<p>' + (s.description || '') + '</p>';
  providerName.textContent = (s.provider && s.provider.name) || '—';
  providerNote.textContent = (s.provider && s.provider.note) || '';
  providerLink.href = (s.provider && s.provider.url) || '#';
  providerLink.style.display = (s.provider && s.provider.url) ? '' : 'none';
  detailsLink.href = s.detailsUrl || '#';
  detailsLink.style.display = s.detailsUrl ? '' : 'none';
  specList.innerHTML = (s.specs || []).map(r => '<li><b>' + r[0] + '</b><span>' + r[1] + '</span></li>').join('');
  const id = sketchfabId(s.sketchfab);
  const url = id ? ('https://sketchfab.com/models/' + id + '/embed?autostart=1&ui_infos=0&ui_watermark=0&ui_watermark_link=0&ui_hint=0&dnt=1') : '';
  if (sketchfabFrame.dataset.sf !== id) { sketchfabFrame.src = url; sketchfabFrame.dataset.sf = id; }
  modal.classList.add('open');
  controls.enabled = false;
  closeViewerBtn.focus();
  renderCrumbs(); say(s.title + ' opened.');
}
function closeViewer() {
  modal.classList.remove('open');
  if (level === 'building') buildingControls(); else cityControls();
  renderCrumbs();
}

/* ---- picking in the scene ------------------------------------------------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
function pointerNdc(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  return ndc;
}
function pickBuilding(e) {
  ray.setFromCamera(pointerNdc(e), camera);
  for (const b of buildings) {
    if (ray.intersectObject(b.cityObj, true).length) return b;
  }
  return null;
}
function pickPoint(e, obj) {
  ray.setFromCamera(pointerNdc(e), camera);
  const hits = ray.intersectObject(obj, true);
  return hits.length ? hits[0].point.clone() : null;
}
renderer.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); downAt = null;
  if (moved > 5 || transition) return;
  if (editor.matPicking) {
    const root = level === 'building' && activeBuilding ? activeBuilding.detailObj
      : (buildings[0] && buildings[0].cityObj);
    if (root) {
      ray.setFromCamera(pointerNdc(e), camera);
      const hit = ray.intersectObject(root, true)[0];
      if (hit && hit.object.material) {
        const m = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
        const name = m.name || '(unnamed)';
        if (editor.setMaterialByName(name)) toast('Selected ' + name);
        return;
      }
    }
  }
  if (editor.picking && level === 'building' && activeBuilding) {
    const p = pickPoint(e, activeBuilding.detailObj);
    if (p) { editor.setMarker(p); return; }
  }
  if (level === 'city') {
    const b = pickBuilding(e);
    if (b) goBuilding(b);
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (transition) { renderer.domElement.style.cursor = 'default'; return; }
  if (editor.picking || editor.matPicking) { renderer.domElement.style.cursor = 'crosshair'; return; }
  if (level === 'city') { renderer.domElement.style.cursor = pickBuilding(e) ? 'pointer' : 'grab'; }
});

/* ---- drag a marker in edit mode ------------------------------------------- */
function attachDrag(el, b, sol) {
  el.addEventListener('pointerdown', e => {
    if (!document.body.classList.contains('edit-mode')) return;
    e.stopPropagation(); e.preventDefault();
    editor.dragging = false;
    const plane = new THREE.Plane();
    const start = solutionWorld(b, sol).clone();
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), start);
    el.classList.add('dragging'); el.setPointerCapture(e.pointerId);
    const move = ev => {
      editor.dragging = true;
      ray.setFromCamera(pointerNdc(ev), camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit)) {
        sol.position = b.group.worldToLocal(hit.clone()).toArray().map(n => +n.toFixed(2));
        if (window.editorSyncSolution) window.editorSyncSolution(sol);
      }
    };
    const up = ev => {
      el.classList.remove('dragging');
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up);
      setTimeout(() => { editor.dragging = false; }, 0);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
}

/* ---- wiring --------------------------------------------------------------- */
backBtn.addEventListener('click', () => goCity());
previewClose.addEventListener('click', hidePreview);
exploreBtn.addEventListener('click', openViewer);
playBtn.addEventListener('click', playAnimation);
closeViewerBtn.addEventListener('click', closeViewer);
modal.addEventListener('pointerdown', e => { if (e.target === modal) closeViewer(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modal.classList.contains('open')) closeViewer();
    else if (activeSolution) hidePreview();
    else if (level === 'building') goCity();
  }
});
addEventListener('resize', resizeRenderer);

/* ---- frame loop ----------------------------------------------------------- */
/* ---- rendering only when it matters -------------------------------------
   A viewer that is being looked at but not touched does not need 60 frames a
   second. Anything that changes the picture calls markDirty, and the loop
   falls back to a slow idle tick so nothing can ever be left stale. */
let dirtyUntil = 0, lastIdle = 0;
function markDirty(ms) {
  const t = performance.now() + (ms == null ? 400 : ms);
  if (t > dirtyUntil) dirtyUntil = t;
}
controls.addEventListener('change', () => markDirty(300));
renderer.domElement.addEventListener('pointermove', () => markDirty(200));
function animationsRunning() {
  for (const b of buildings) { if (b.action && b.action.isRunning()) return true; }
  return false;
}

const clock = new THREE.Clock();
const EASINGS = {
  inout: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  linear: t => t
};
function ease(t) {
  const f = EASINGS[(CONFIG.transitions && CONFIG.transitions.camEase) || 'inout'];
  return (f || EASINGS.inout)(t);
}
function smooth(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }                 // opacity, soft at both ends
/* Smoothstep applied repeatedly. Each pass pushes values further towards 0 or
   1, so the crossover gets quicker without ever losing the soft ends. */
function fadeCurve(u, sharpness) {
  let v = smooth(u);
  const n = Math.max(1, Math.min(5, sharpness == null ? 2.2 : sharpness));
  const whole = Math.floor(n), frac = n - whole;
  for (let i = 1; i < whole; i++) v = smooth(v);
  if (frac > 0.001) v = v * (1 - frac) + smooth(v) * frac;
  return v;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);

  const busy = !!transition || swayUntil > now || editor.on || animationsRunning();
  if (!busy && now > dirtyUntil) {
    if (now - lastIdle < 250) return;   // idle: a slow tick, not a stopped loop
    lastIdle = now;
  }
  buildings.forEach(b => b.mixer.update(dt));

  if (swayUntil > now && swayBuilding) {
    const b = swayBuilding;
    const left = (swayUntil - now) / 4200;
    const amp = (b.detailBox.max.y - b.detailBox.min.y) * 0.012 * left * left;
    b.group.position.x = b.baseX + Math.sin(now * 0.008) * amp;
  } else if (swayBuilding) {
    swayBuilding.group.position.x = swayBuilding.baseX; swayBuilding = null;
    playBtn.classList.remove('is-stop');
    playBtn.innerHTML = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M0 0l12 7-12 7z"/></svg>';
  }

  if (transition) {
    const t = Math.min(1, (now - transition.start) / transition.duration), e = ease(t);
    const a = transition.from, b = transition.to;
    camera.position.lerpVectors(a.pos, b.pos, e);
    controls.target.lerpVectors(a.target, b.target, e);
    frustum = THREE.MathUtils.lerp(a.frustum, b.frustum, e);
    camera.zoom = THREE.MathUtils.lerp(a.zoom, b.zoom, e);
    setFrustum(frustum);
    if (transition.fadeOut || transition.fadeIn) {
      // One shared curve, so what leaves and what arrives always add up to one
      // and the building never appears to thin out. The curve is deliberately
      // steep in the middle: two different shapes sitting in the same space
      // read as a muddle while both are half visible, so the dissolve spends
      // as little time there as it can.
      const T = CONFIG.transitions;
      const a = T.fadeStart == null ? 0.18 : T.fadeStart;
      const b = T.fadeEnd == null ? 0.88 : T.fadeEnd;
      const u = (t - a) / Math.max(0.01, b - a);
      const p = fadeCurve(u, T.fadeSharpness);
      let outA = 1 - p, inA = p;
      switch (T.fadeMode) {
        case 'cut':                                    // straight swap half way
          outA = p < 0.5 ? 1 : 0; inA = p < 0.5 ? 0 : 1; break;
        case 'outFirst':                               // the volume clears, then the structure arrives
          outA = Math.max(0, 1 - p * 2); inA = Math.max(0, p * 2 - 1); break;
        case 'inFirst':                                // the structure arrives under the volume first
          inA = Math.min(1, p * 2); outA = Math.max(0, 1 - Math.max(0, p * 2 - 1)); break;
      }
      if (transition.fadeOut) setOpacity(transition.fadeOut, outA, true);
      if (transition.fadeIn) setOpacity(transition.fadeIn, inA, inA < 0.92);
    }
    if (t >= 1) {
      const done = transition.onDone;
      transition = null;
      if (done) done();
    }
  }
  updateSky();
  controls.update();
  if (usePost && composer) composer.render(); else renderer.render(scene, camera);
  // Positioned after the render, so the markers project with exactly the
  // matrices the frame was drawn with. Doing it before meant they were always
  // one frame behind and appeared to slide while the model was rotating.
  updateMarkers();
}


/* ============================================================================
   3. EDIT PANEL
   Everything here only runs when edit mode is on. It changes CONFIG in memory
   and writes it back out as text you can paste over section 1.
   ============================================================================ */

/* ==== PANEL CODE START ==== */
const editor = {
  on: false, picking: false, matPicking: false, dragging: false, bIndex: 0, sIndex: 0, pIndex: 0, matName: null, objName: null,

  get building() { return buildings[this.bIndex] || buildings[0] || null; },
  get solutionCfg() {
    const b = this.building; if (!b) return null;
    return b.cfg.solutions[this.sIndex] || b.cfg.solutions[0] || null;
  },

  toggle() { this.on ? this.close() : this.open(); },
  open() {
    this.on = true; document.body.classList.add('edit-mode');
    if (activeSolution && activeBuilding) {
      const bi = buildings.indexOf(activeBuilding);
      if (bi >= 0) this.bIndex = bi;
      const si = activeBuilding.cfg.solutions.indexOf(activeSolution);
      if (si >= 0) this.sIndex = si;
    }
    resizeRenderer(); this.syncAll();
    toast('Edit mode on. Press E to leave.');
  },
  close() {
    this.on = false; this.picking = false; this.matPicking = false;
    document.body.classList.remove('edit-mode');
    $('edPick').classList.remove('on'); $('edPickMat').classList.remove('on');
    $('edOut').classList.remove('open');
    resizeRenderer();
  },

  refreshView() {
    if (transition) return;
    if (level === 'building' && activeBuilding) applyCamState(camStateFor(buildingFraming(activeBuilding)));
    else applyCamState(camStateFor(cityFraming()));
  },

  setMarker(worldPoint) {
    const s = this.solutionCfg, b = this.building;
    if (!s || !b) return;
    s.position = b.group.worldToLocal(worldPoint.clone()).toArray().map(n => +n.toFixed(2));
    this.syncSolution();
    toast('Marker ' + s.number + ' moved.');
  },

  /* ---- sync: CONFIG -> panel ---------------------------------------- */
  /* The hex fields and their swatches are two views of one value. */
  refreshSwatches() {
    COLOR_FIELDS.forEach(id => {
      const tx = $(id), sw = $(id + 'Sw');
      if (!tx || !sw) return;
      const v = (tx.value || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) sw.value = v.toLowerCase();
    });
  },
  syncAll() { this.syncCity(); this.syncBuildingList(); this.syncBuilding(); this.syncSolutionList(); this.syncSolution(); this.syncScene(); this.syncObjects(); this.syncProps(); this.syncLook(); this.syncMaterials(); this.syncText(); this.refreshSwatches(); },

  syncCity() {
    const v = CONFIG.cityView;
    $('cityFit').value = v.fit || 'manual';
    set('cityPad', v.padding, 'v_cityPad', x => Number(x).toFixed(2));
    set('cityAz', v.azimuth, 'v_cityAz', x => x + '°');
    set('cityEl', v.elevation, 'v_cityEl', x => x + '°');
    set('cityFr', v.frustum, 'v_cityFr');
    $('cityTx').value = v.target[0]; $('cityTy').value = v.target[1]; $('cityTz').value = v.target[2];
  },
  syncBuildingList() {
    const list = $('edBuildingList'); list.replaceChildren();
    CONFIG.buildings.forEach((c, i) => {
      const btn = document.createElement('button'); btn.type = 'button';
      btn.className = i === this.bIndex ? 'on' : '';
      btn.innerHTML = '<i>' + (i + 1) + '</i><b>' + (c.name || c.id) + '</b>';
      btn.addEventListener('click', () => {
        this.bIndex = i; this.sIndex = 0;
        this.syncBuildingList(); this.syncBuilding(); this.syncSolutionList(); this.syncSolution();
        if (buildings[i]) goBuilding(buildings[i]);
      });
      list.appendChild(btn);
    });
  },
  syncBuilding() {
    const c = this.building && this.building.cfg; if (!c) return;
    $('bPosX').value = c.position[0]; $('bPosY').value = c.position[1]; $('bPosZ').value = c.position[2];
    set('bRot', c.rotation, 'v_bRot', x => x + '°');
    set('bScale', c.scale, 'v_bScale', x => Number(x).toFixed(2));
    $('bName').value = c.name || '';
    set('bMark', c.markerHeight, 'v_bMark', x => Number(x).toFixed(2));
    const v = c.view;
    $('bFit').value = v.fit;
    set('bAz', v.azimuth, 'v_bAz', x => x + '°');
    set('bEl', v.elevation, 'v_bEl', x => x + '°');
    set('bPad', v.padding, 'v_bPad', x => Number(x).toFixed(1));
    set('bFr', v.frustum, 'v_bFr');
    $('bTx').value = v.target[0]; $('bTy').value = v.target[1]; $('bTz').value = v.target[2];
    $('bNodeCity').value = c.nodes.city; $('bNodeDetail').value = c.nodes.detail;
    const o = CONFIG.orbit;
    const T = CONFIG.transitions;
    set('trIn', T.toBuilding, 'v_trIn', x => x + ' ms');
    set('trOut', T.toCity, 'v_trOut', x => x + ' ms');
    set('trSol', T.toSolution, 'v_trSol', x => x + ' ms');
    set('trFadeA', T.fadeStart == null ? 0.18 : T.fadeStart, 'v_trFadeA', x => Number(x).toFixed(2));
    set('trFadeB', T.fadeEnd == null ? 0.88 : T.fadeEnd, 'v_trFadeB', x => Number(x).toFixed(2));
    set('trSharp', T.fadeSharpness == null ? 2.2 : T.fadeSharpness, 'v_trSharp', x => Number(x).toFixed(1));
    if ($('trCamEase')) $('trCamEase').value = T.camEase || 'inout';
    if ($('trFadeMode')) $('trFadeMode').value = T.fadeMode || 'cross';
    $('orbFree').checked = !!o.free;
    set('polMin', o.polarMin, 'v_polMin', x => x + '°'); set('polMax', o.polarMax, 'v_polMax', x => x + '°');
    set('zoomMin', o.zoomMin, 'v_zoomMin', x => Number(x).toFixed(2)); set('zoomMax', o.zoomMax, 'v_zoomMax', x => Number(x).toFixed(1));
  },
  syncSolutionList() {
    const list = $('edSolutionList'); list.replaceChildren();
    const b = this.building; if (!b) return;
    b.cfg.solutions.forEach((s, i) => {
      const btn = document.createElement('button'); btn.type = 'button';
      btn.className = i === this.sIndex ? 'on' : '';
      btn.innerHTML = '<i>' + s.number + '</i><b>' + (s.title || s.label || 'Untitled') + '</b>';
      btn.addEventListener('click', () => {
        this.sIndex = i; this.syncSolutionList(); this.syncSolution();
        if (level !== 'building') goBuilding(b);
        selectSolution(b, s);
      });
      list.appendChild(btn);
    });
  },
  syncSolution() {
    const s = this.solutionCfg, b = this.building; if (!s || !b) return;
    const p = solutionLocal(b, s);
    $('sPosX').value = +p.x.toFixed(2); $('sPosY').value = +p.y.toFixed(2); $('sPosZ').value = +p.z.toFixed(2);
    $('sNode').value = s.node || '';
    $('sNumber').value = s.number; $('sLabel').value = s.label || ''; $('sTitle').value = s.title || '';
    $('sDesc').value = s.description || ''; $('sBody').value = (s.body || []).join('\n');
    $('sSketchfab').value = s.sketchfab || '';
    $('sProvName').value = (s.provider && s.provider.name) || '';
    $('sProvNote').value = (s.provider && s.provider.note) || '';
    $('sProvUrl').value = (s.provider && s.provider.url) || '';
    $('sDetailsUrl').value = s.detailsUrl || '';
    const own = s.view || null;
    const hasCam = !!(own && (own.azimuth != null || own.target));
    $('solCamInfo').textContent = hasCam
      ? 'This solution opens with its own stored view.'
      : 'No stored view. The camera keeps the angle the viewer is already using and centres on the marker.';
    const shown = own || {};
    const a = camAngles();
    set('svAz', shown.azimuth != null ? shown.azimuth : Math.round(a.az), 'v_svAz', x => Math.round(x) + '°');
    set('svEl', shown.elevation != null ? shown.elevation : Math.round(a.el), 'v_svEl', x => Math.round(x) + '°');
    set('svFr', shown.frustum != null ? shown.frustum : CONFIG.solutionView.frustum, 'v_svFr', x => Math.round(x));
    const sel = $('sAnim'); sel.replaceChildren();
    const none = document.createElement('option'); none.value = ''; none.textContent = clips.length ? 'None (use placeholder)' : 'No clips in the model';
    sel.appendChild(none);
    clips.forEach(c => { const o = document.createElement('option'); o.value = c.name; o.textContent = c.name; sel.appendChild(o); });
    sel.value = (s.animation && s.animation.clip) || '';
    $('sAnimLabel').value = (s.animation && s.animation.label) || '';
    $('edAnimHint').textContent = clips.length
      ? 'Clips found in the model: ' + clips.map(c => c.name).join(', ')
      : 'This model has no animation clips yet. The play button runs the built in placeholder until you export one from Blender.';
  },
  syncScene() {
    const E = CONFIG.environment;
    $('envSource').value = E.source;
    set('envRot', E.rotation, 'v_envRot', x => x + '°');
    $('bgMode').value = E.background;
    $('bgColor').value = E.backgroundColor || CONFIG.colors.skyTop;
    if ($('bgInfo')) $('bgInfo').textContent = E.backdropImage
      ? 'A picture is loaded just for the backdrop, about ' + Math.round(E.backdropImage.length / 1365) + ' KB.'
      : (E.source === 'image' && E.image ? 'The backdrop uses the surrounding picture.'
        : 'No picture yet, so the backdrop can only be a flat colour.');
    set('bgBlur', E.backgroundBlur, 'v_bgBlur', x => Number(x).toFixed(2));
    set('bgInt', E.backgroundIntensity, 'v_bgInt', x => Number(x).toFixed(2));
    set('bgSpread', E.spread == null ? 1.2 : E.spread, 'v_bgSpread', x => Number(x).toFixed(2));
    $('mTerrain').value = CONFIG.model.terrainNode || '';
    if (E.source === 'image' && E.image)
      $('envInfo').textContent = 'Using a loaded picture, about ' + Math.round(E.image.length / 1365) + ' KB in the file.';
    const names = modelNodeNames();
    const dl = $('nodeList'); dl.replaceChildren();
    names.forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });
    $('nodeReport').textContent = names.length
      ? names.length + ' named objects: ' + names.join(', ')
      : 'No named objects found.';
    $('modelInfo').textContent = pendingExport
      ? 'A loaded .gltf is in use. Saving packs it and its files into a single .glb and writes it in. Nothing is re-encoded, so the size and the quality stay as Blender left them.'
      : (pendingModelB64
        ? 'A loaded model is in use. Saving writes it into the file, about ' + Math.round(pendingModelB64.length / 1365) + ' KB.'
        : (missingNodes.length
          ? 'Not found in this model: ' + missingNodes.join(', ') + '. The whole model is shown instead, so pick the right objects below.'
          : 'Using the model that came with this file.'));
  },
  get propCfg() { return (CONFIG.props || [])[this.pIndex] || null; },
  syncObjects() {
    const sel = $('objSelect'); if (!sel) return;
    const roots = (template ? template.children : []).map(o => o.name).filter(Boolean);
    sel.replaceChildren();
    if (!roots.length) {
      const o = document.createElement('option'); o.value = ''; o.textContent = 'no named objects';
      sel.appendChild(o); this.objName = null;
    } else {
      roots.forEach(n => {
        const o = document.createElement('option'); o.value = n;
        o.textContent = ((CONFIG.nodeTransforms || {})[n] ? '\u2022 ' : '') + n;
        sel.appendChild(o);
      });
      if (!roots.includes(this.objName)) this.objName = roots[0];
      sel.value = this.objName;
    }
    const t = (CONFIG.nodeTransforms || {})[this.objName] || {};
    const p = t.position || [0, 0, 0], r = t.rotation || [0, 0, 0];
    set('objScale', t.scale == null ? 1 : t.scale, 'v_objScale', x => Number(x).toFixed(2));
    $('objPosX').value = p[0]; $('objPosY').value = p[1]; $('objPosZ').value = p[2];
    $('objRotX').value = r[0]; $('objRotY').value = r[1]; $('objRotZ').value = r[2];
    const used = Object.keys(CONFIG.nodeTransforms || {});
    $('objInfo').textContent = this.objName
      ? ((CONFIG.nodeTransforms || {})[this.objName] ? 'Changed from the export.' : 'As exported.')
      + (used.length ? ' Changed so far: ' + used.join(', ') + '.' : '')
      : 'This model has no named top level objects.';
  },
  syncProps() {
    const list = $('edPropList'); list.replaceChildren();
    (CONFIG.props || []).forEach((c, i) => {
      const btn = document.createElement('button'); btn.type = 'button';
      btn.className = i === this.pIndex ? 'on' : '';
      btn.innerHTML = '<i>' + (i + 1) + '</i><b>' + (c.node || (c.shape === 'box' ? 'Box' : 'Plane')) + '</b>';
      btn.addEventListener('click', () => { this.pIndex = i; this.syncProps(); });
      list.appendChild(btn);
    });
    const c = this.propCfg;
    const on = !!c;
    ['pNode', 'pPosX', 'pPosY', 'pPosZ', 'pRotX', 'pRotY', 'pRotZ', 'pScale', 'pColor']
      .forEach(id => { if ($(id)) $(id).disabled = !on; });
    if (!c) return;
    $('pNode').value = c.node || '';
    const pos = c.position || [0, 0, 0], rot = c.rotation || [0, 0, 0];
    $('pPosX').value = pos[0]; $('pPosY').value = pos[1]; $('pPosZ').value = pos[2];
    $('pRotX').value = rot[0]; $('pRotY').value = rot[1]; $('pRotZ').value = rot[2];
    set('pScale', c.scale == null ? 1 : c.scale, 'v_pScale', x => Number(x).toFixed(1));
    $('pColor').value = c.color || '#B9C4CC';
  },
  syncLook() {
    const L = CONFIG.lighting, S = CONFIG.shadows, P = CONFIG.post;
    $('pTone').value = P.toneMapping;
    $('pEnabled').checked = !!P.enabled;
    set('pBloom', P.bloom, 'v_pBloom', x => Number(x).toFixed(2));
    set('pThresh', P.bloomThreshold, 'v_pThresh', x => Number(x).toFixed(2));
    set('pRadius', P.bloomRadius, 'v_pRadius', x => Number(x).toFixed(2));
    set('pVig', P.vignette, 'v_pVig', x => Number(x).toFixed(2));
    set('sunAz', L.sunAzimuth, 'v_sunAz', x => x + '°');
    set('sunEl', L.sunElevation, 'v_sunEl', x => x + '°');
    set('sunI', L.sunIntensity, 'v_sunI', x => Number(x).toFixed(2));
    set('skyI', L.skyIntensity, 'v_skyI', x => Number(x).toFixed(2));
    set('ambI', L.ambientIntensity, 'v_ambI', x => Number(x).toFixed(2));
    set('envI', L.environmentIntensity, 'v_envI', x => Number(x).toFixed(2));
    set('expo', L.exposure, 'v_expo', x => Number(x).toFixed(2));
    $('shQuality').value = S.quality;
    $('shRes').value = String(S.resolution);
    set('shSpread', S.spread, 'v_shSpread', x => Number(x).toFixed(2));
    set('shNb', S.normalBias, 'v_shNb', x => Number(x).toFixed(2));
  },
  syncMaterials() {
    const sel = $('matSelect'); const names = [...materialIndex.keys()].sort();
    if (!this.matName || !materialIndex.has(this.matName)) this.matName = names[0] || null;
    sel.replaceChildren();
    names.forEach(n => {
      const o = document.createElement('option'); o.value = n;
      o.textContent = (CONFIG.materials[n] ? '• ' : '') + n;
      sel.appendChild(o);
    });
    if (this.matName) sel.value = this.matName;
    const list = this.matName ? materialIndex.get(this.matName) : null;
    if (!list || !list.length) { $('matUsage').textContent = 'This model has no named materials.'; return; }
    const m = list[0], base = m.userData._base || {}, over = CONFIG.materials[this.matName] || {};
    $('matUsage').textContent = list.length + ' surface' + (list.length > 1 ? 's use' : ' uses') + ' this material' +
      (CONFIG.materials[this.matName] ? ', changed from the export' : ', as exported');
    $('matColor').value = over.color != null ? over.color : (base.color || '#FFFFFF');
    const r = over.roughness != null ? over.roughness : base.roughness;
    const mt = over.metalness != null ? over.metalness : base.metalness;
    const op = over.opacity != null ? over.opacity : base.opacity;
    set('matRough', r == null ? 0.5 : r, 'v_matRough', x => Number(x).toFixed(2));
    set('matMetal', mt == null ? 0 : mt, 'v_matMetal', x => Number(x).toFixed(2));
    set('matOpacity', op == null ? 1 : op, 'v_matOpacity', x => Number(x).toFixed(2));
    $('matEmissive').value = over.emissive != null ? over.emissive : (base.emissive || '#000000');
    const ei = over.emissiveIntensity != null ? over.emissiveIntensity : base.emissiveIntensity;
    const ns = over.normalScale != null ? over.normalScale : base.normalScale;
    const ao = over.aoMapIntensity != null ? over.aoMapIntensity : base.aoMapIntensity;
    set('matEmisI', ei == null ? 1 : ei, 'v_matEmisI', x => Number(x).toFixed(2));
    set('matNormal', ns == null ? 1 : ns, 'v_matNormal', x => Number(x).toFixed(2));
    set('matAo', ao == null ? 1 : ao, 'v_matAo', x => Number(x).toFixed(2));
    $('matTransparent').checked = over.transparent != null ? over.transparent : !!base.transparent;
    $('matDouble').checked = over.doubleSided != null ? over.doubleSided : (base.side === THREE.DoubleSide);
    const slot = $('texSlot') ? $('texSlot').value : 'map';
    const info = $('texInfo');
    if (info) {
      if (over[slot]) info.textContent = 'This material uses a replaced ' +
        (slot === 'map' ? 'colour texture' : 'normal map') + ', about ' + Math.round(over[slot].length / 1365) + ' KB.';
      else if (base.maps && base.maps[slot]) info.textContent = 'Using the texture from the model. Choose an image to replace it.';
      else info.textContent = 'This material has no ' + (slot === 'map' ? 'colour texture' : 'normal map') + '. Choosing an image adds one.';
    }
  },
  setMaterialByName(name) {
    if (!materialIndex.has(name)) return false;
    this.matName = name; this.syncMaterials();
    document.querySelectorAll('.ed-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === 'materials'));
    document.querySelectorAll('.ed-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === 'materials'));
    return true;
  },
  editMaterial(patch) {
    if (!this.matName) return;
    const cur = CONFIG.materials[this.matName] || (CONFIG.materials[this.matName] = {});
    Object.assign(cur, patch);
    applyMaterials();
    this.syncMaterials();
  },

  syncText() {
    const t = CONFIG.text, c = CONFIG.colors;
    $('tTitle').value = t.title; $('tSubtitle').value = t.subtitle;
    $('tHintCity').value = t.hintCity; $('tHintBuilding').value = t.hintBuilding;
    $('tBack').value = t.back; $('tExplore').value = t.explore;
    $('tProvider').value = t.provider; $('tDetails').value = t.details;
    $('tBrand').value = c.brand; $('tPaper').value = c.paper;
    $('tSkyTop').value = c.skyTop; $('tSkyBottom').value = c.skyBottom;
    $('gColor').value = CONFIG.ground.color;
    set('gRough', CONFIG.ground.roughness, 'v_gRough', x => Number(x).toFixed(2));
    $('gVisible').checked = CONFIG.ground.visible !== false;
    $('gUseModel').checked = !!CONFIG.ground.useModelMaterial;
    $('cOpaque').checked = !!CONFIG.cityShape.forceOpaque;
  },

  /* ---- export -------------------------------------------------------- */
  exportText() {
    const notes = {
      model: 'the 3D file',
      ground: 'the ground plane',
      cityShape: 'how the closed volume is drawn at level 1',
      text: 'interface wording',
      colors: 'colours',
      cityView: 'level 1: the isometric city view',
      transitions: 'how long each move takes, in milliseconds',
      solutionView: 'level 3: the camera move when a solution is picked',
      environment: 'the surrounding light and what you see behind the model',
      props: 'extra objects placed in the scene by hand',
      nodeTransforms: 'size, move or turn a whole object from the model, keyed by its name',
      post: 'extra render passes, off by default because they cost performance',
      lighting: 'sun, sky and exposure',
      shadows: "shadows. quality: 'off' | 'sharp' | 'soft' | 'softer'",
      materials: 'per material overrides, keyed by the material name from Blender',
      orbit: 'level 2: how far the user may orbit',
      animation: 'animation, placeholder runs until a clip is exported',
      buildings: 'the buildings, copy a block to add another one'
    };
    let out = 'const CONFIG = {\n';
    const keys = Object.keys(CONFIG);
    keys.forEach((k, i) => {
      out += '\n  /* ' + (notes[k] || k) + ' */\n';
      out += '  ' + keyText(k) + ': ' + print(CONFIG[k], 1) + (i < keys.length - 1 ? ',' : '') + '\n';
    });
    out += '};';
    return out;
  }
};
window.editorSyncSolution = s => { if (editor.on) editor.syncSolution(); };

/* ---- small helpers for the panel ------------------------------------ */
function set(id, value, labelId, fmtFn) {
  const el = $(id); if (!el) return;
  el.value = value;
  if (labelId && $(labelId)) $(labelId).textContent = fmtFn ? fmtFn(value) : value;
}
function toast(msg) {
  const t = $('edToast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}
/* Short notes kept beside individual fields, so a saved file stays as
   readable as the one it was generated from. Keyed by field name. */
const FIELD_NOTES = {
  url: 'sits next to this HTML file', terrainNode: 'ground plane, shown at every level',
  useModelMaterial: 'true uses the material assigned in Blender',
  forceOpaque: 'draws the level 1 volume solid instead of as glass',
  fit: "'auto' or 'solutions' or 'building' frame automatically, 'manual' uses the values below",
  azimuth: 'degrees around the vertical axis', elevation: 'degrees above the horizon',
  padding: 'used by the automatic framing modes',
  frustum: 'used by manual framing. Smaller number = closer',
  target: 'the point the camera looks at',
  fadeStart: 'when the dissolve begins, as a fraction of the move',
  fadeEnd: 'when the dissolve finishes',
  fadeSharpness: 'higher spends less time half way between the two shapes',
  fadeMode: 'cross | outFirst | inFirst | cut',
  camEase: 'inout | out | in | linear',
  free: 'true ignores every orbit limit',
  polarMin: 'lowest angle above the horizon, negative allows looking from below',
  polarMax: 'highest angle',
  zoomMin: 'how far out the user may zoom', zoomMax: 'how far in',
  keepAngle: 'keep the angle the user is already looking from',
  markerHeight: '0 is the base, 1 is the roof',
  node: 'empty from Blender. Leave position null to follow it',
  quality: "'off' | 'sharp' | 'soft' | 'softer'",
  resolution: 'lower is softer and blockier, higher is crisper',
  spread: 'size of the area the shadow map covers',
  normalBias: 'raise if shadows stripe flat surfaces, lower if they float',
  placeholder: "'sway' or 'off'",
  visible: 'false hides the very large ground plane so the backdrop shows',
  backgroundColor: 'used when the backdrop is a flat colour',
  backdropImage: 'a picture used only behind the model',
  spread: 'how much of the panorama fits across the view',
  source: "'gradient' builds a sky in code, 'image' uses the picture below",
  image: 'equirectangular picture stored as data',
  background: "'color' uses colors.skyTop, 'environment' shows the sky",
  toneMapping: 'none | linear | reinhard | cineon | aces | agx | neutral',
  bloom: 'glow strength on bright areas',
  vignette: 'darkens the corners',
  clip: 'animation clip name from Blender. Empty uses the placeholder'
};
function keyText(k) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
}
function print(v, depth) {
  const pad = '  '.repeat(depth + 1), padEnd = '  '.repeat(depth);
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    const simple = v.every(x => x === null || ['number', 'string', 'boolean'].includes(typeof x));
    if (simple && v.length <= 4 && JSON.stringify(v).length < 70) return JSON.stringify(v);
    return '[\n' + v.map(x => pad + print(x, depth + 1)).join(',\n') + '\n' + padEnd + ']';
  }
  if (typeof v === 'object') {
    const k = Object.keys(v);
    if (!k.length) return '{}';
    // Material names contain spaces and dots, so any key that is not a plain
    // identifier has to be quoted or the saved file will not parse.
    const lines = k.map(key => pad + keyText(key) + ': ' + print(v[key], depth + 1));
    return '{\n' + lines.map((line, i) => {
      const note = FIELD_NOTES[k[i]];
      return line + (i < lines.length - 1 ? ',' : '') + (note ? '   // ' + note : '');
    }).join('\n') + '\n' + padEnd + '}';
  }
  if (typeof v === 'number') return String(+v.toFixed(4));
  return JSON.stringify(v);
}

/* ---- panel bindings -------------------------------------------------- */
function bind(id, handler, evt = 'input') { const el = $(id); if (el) el.addEventListener(evt, handler); }

$('edClose').addEventListener('click', () => editor.close());
document.querySelectorAll('.ed-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ed-tabs button').forEach(b => b.classList.toggle('on', b === btn));
    document.querySelectorAll('.ed-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === btn.dataset.tab));
  });
});

/* City camera */
bind('cityFit', e => { CONFIG.cityView.fit = e.target.value; editor.refreshView(); }, 'change');
bind('cityPad', e => {
  CONFIG.cityView.padding = +e.target.value; $('v_cityPad').textContent = (+e.target.value).toFixed(2);
  if (CONFIG.cityView.fit !== 'auto') { CONFIG.cityView.fit = 'auto'; $('cityFit').value = 'auto'; toast('Framing switched to fit every building.'); }
  editor.refreshView();
});
bind('cityAz', e => { CONFIG.cityView.azimuth = +e.target.value; $('v_cityAz').textContent = e.target.value + '°'; editor.refreshView(); });
bind('cityEl', e => { CONFIG.cityView.elevation = +e.target.value; $('v_cityEl').textContent = e.target.value + '°'; editor.refreshView(); });
bind('cityFr', e => { CONFIG.cityView.frustum = +e.target.value; $('v_cityFr').textContent = e.target.value; cityManual(); editor.refreshView(); });
['cityTx', 'cityTy', 'cityTz'].forEach((id, i) => bind(id, e => { CONFIG.cityView.target[i] = +e.target.value; cityManual(); editor.refreshView(); }));
/* Zoom and look-at only mean anything in manual framing, so reaching for one
   switches the mode instead of appearing to do nothing. */
function cityManual() {
  if (CONFIG.cityView.fit !== 'manual') { CONFIG.cityView.fit = 'manual'; $('cityFit').value = 'manual'; toast('Framing switched to manual.'); }
}
$('edGrabCity').addEventListener('click', () => {
  const t = controls.target, d = camera.position.clone().sub(t);
  CONFIG.cityView.fit = 'manual';
  CONFIG.cityView.target = [+t.x.toFixed(1), +t.y.toFixed(1), +t.z.toFixed(1)];
  CONFIG.cityView.azimuth = Math.round(Math.atan2(d.z, d.x) / DEG);
  CONFIG.cityView.elevation = Math.round(Math.asin(THREE.MathUtils.clamp(d.y / d.length(), -1, 1)) / DEG);
  CONFIG.cityView.frustum = Math.round(frustum / camera.zoom);
  editor.syncCity(); toast('City camera stored.');
});

/* Building placement */
['bPosX', 'bPosY', 'bPosZ'].forEach((id, i) => bind(id, e => {
  const b = editor.building; if (!b) return;
  b.cfg.position[i] = +e.target.value; applyPlacement(b); fitShadow(); editor.refreshView();
}));
bind('bRot', e => { const b = editor.building; if (!b) return; b.cfg.rotation = +e.target.value; $('v_bRot').textContent = e.target.value + '°'; applyPlacement(b); editor.refreshView(); });
bind('bScale', e => { const b = editor.building; if (!b) return; b.cfg.scale = +e.target.value; $('v_bScale').textContent = (+e.target.value).toFixed(2); applyPlacement(b); fitShadow(); editor.refreshView(); });
bind('bName', e => { const b = editor.building; if (!b) return; b.cfg.name = e.target.value; editor.syncBuildingList(); buildMarkers(); renderCrumbs(); });
bind('bMark', e => { const b = editor.building; if (!b) return; b.cfg.markerHeight = +e.target.value; $('v_bMark').textContent = (+e.target.value).toFixed(2); });

/* Building camera */
bind('bFit', e => { const b = editor.building; if (!b) return; b.cfg.view.fit = e.target.value; editor.refreshView(); }, 'change');
bind('bAz', e => { const b = editor.building; if (!b) return; b.cfg.view.azimuth = +e.target.value; $('v_bAz').textContent = e.target.value + '°'; editor.refreshView(); });
bind('bEl', e => { const b = editor.building; if (!b) return; b.cfg.view.elevation = +e.target.value; $('v_bEl').textContent = e.target.value + '°'; editor.refreshView(); });
bind('bPad', e => {
  const b = editor.building; if (!b) return;
  b.cfg.view.padding = +e.target.value; $('v_bPad').textContent = (+e.target.value).toFixed(1);
  if (b.cfg.view.fit === 'manual') { b.cfg.view.fit = 'solutions'; $('bFit').value = 'solutions'; toast('Framing switched to fit the solutions.'); }
  editor.refreshView();
});
bind('bFr', e => {
  const b = editor.building; if (!b) return;
  b.cfg.view.frustum = +e.target.value; $('v_bFr').textContent = e.target.value;
  buildingManual(b); editor.refreshView();
});
['bTx', 'bTy', 'bTz'].forEach((id, i) => bind(id, e => {
  const b = editor.building; if (!b) return;
  b.cfg.view.target[i] = +e.target.value; buildingManual(b); editor.refreshView();
}));
function buildingManual(b) {
  if (b.cfg.view.fit !== 'manual') { b.cfg.view.fit = 'manual'; $('bFit').value = 'manual'; toast('Framing switched to manual.'); }
}
$('edGrabBuilding').addEventListener('click', () => {
  const b = editor.building; if (!b) return toast('Select a building first.');
  const t = controls.target, d = camera.position.clone().sub(t);
  b.cfg.view.fit = 'manual';
  b.cfg.view.target = [+t.x.toFixed(1), +t.y.toFixed(1), +t.z.toFixed(1)];
  b.cfg.view.azimuth = Math.round(Math.atan2(d.z, d.x) / DEG);
  b.cfg.view.elevation = Math.round(Math.asin(THREE.MathUtils.clamp(d.y / d.length(), -1, 1)) / DEG);
  b.cfg.view.frustum = Math.round(frustum / camera.zoom);
  editor.syncBuilding(); toast('Building camera stored.');
});
bind('trIn', e => { CONFIG.transitions.toBuilding = +e.target.value; $('v_trIn').textContent = e.target.value + ' ms'; });
bind('trOut', e => { CONFIG.transitions.toCity = +e.target.value; $('v_trOut').textContent = e.target.value + ' ms'; });
bind('trSol', e => { CONFIG.transitions.toSolution = +e.target.value; $('v_trSol').textContent = e.target.value + ' ms'; });
bind('trFadeA', e => {
  const v = Math.min(+e.target.value, (CONFIG.transitions.fadeEnd || 0.88) - 0.05);
  CONFIG.transitions.fadeStart = v; $('v_trFadeA').textContent = v.toFixed(2);
});
bind('trFadeB', e => {
  const v = Math.max(+e.target.value, (CONFIG.transitions.fadeStart || 0.18) + 0.05);
  CONFIG.transitions.fadeEnd = v; $('v_trFadeB').textContent = v.toFixed(2);
});
bind('trSharp', e => { CONFIG.transitions.fadeSharpness = +e.target.value; $('v_trSharp').textContent = (+e.target.value).toFixed(1); });
/* Runs the whole move so it can be judged rather than imagined. */
$('edTryTransition').addEventListener('click', () => {
  const b = editor.building; if (!b) return;
  if (level === 'building') { goCity(); setTimeout(() => goBuilding(b), CONFIG.transitions.toCity + 250); }
  else goBuilding(b);
});
bind('orbFree', e => { CONFIG.orbit.free = e.target.checked; if (level === 'building') buildingControls(); }, 'change');
bind('polMin', e => { CONFIG.orbit.polarMin = +e.target.value; $('v_polMin').textContent = e.target.value + '°'; if (level === 'building') buildingControls(); });
bind('polMax', e => { CONFIG.orbit.polarMax = +e.target.value; $('v_polMax').textContent = e.target.value + '°'; if (level === 'building') buildingControls(); });
bind('zoomMin', e => { CONFIG.orbit.zoomMin = +e.target.value; $('v_zoomMin').textContent = (+e.target.value).toFixed(2); if (level === 'building') buildingControls(); });
bind('zoomMax', e => { CONFIG.orbit.zoomMax = +e.target.value; $('v_zoomMax').textContent = (+e.target.value).toFixed(1); if (level === 'building') buildingControls(); });
// changing which object a level uses has to rebuild the scene to take effect
bind('bNodeCity', e => {
  const b = editor.building; if (!b) return;
  b.cfg.nodes.city = e.target.value.trim();
  rebuild(); editor.matName = null; editor.syncAll();
}, 'change');
bind('bNodeDetail', e => {
  const b = editor.building; if (!b) return;
  b.cfg.nodes.detail = e.target.value.trim();
  rebuild(); editor.matName = null; editor.syncAll();
}, 'change');

/* Buildings: add / remove */
$('edAddBuilding').addEventListener('click', () => {
  const src = editor.building; if (!src) return;
  const copy = JSON.parse(JSON.stringify(src.cfg));
  const n = CONFIG.buildings.length + 1;
  copy.id = src.cfg.id + '-' + n; copy.name = (src.cfg.name || 'Building') + ' ' + n;
  const w = (src.cityBox.max.x - src.cityBox.min.x) * 1.6;
  copy.position = [+(src.cfg.position[0] + w).toFixed(1), src.cfg.position[1], src.cfg.position[2]];
  CONFIG.buildings.push(copy);
  rebuild(); editor.bIndex = CONFIG.buildings.length - 1; editor.sIndex = 0; editor.syncAll();
  toast('Copy added. Move it with the position fields.');
});
$('edRemoveBuilding').addEventListener('click', () => {
  if (CONFIG.buildings.length <= 1) return toast('Keep at least one building.');
  CONFIG.buildings.splice(editor.bIndex, 1);
  editor.bIndex = 0; editor.sIndex = 0; rebuild(); editor.syncAll(); toast('Building removed.');
});

/* Solutions */
$('edPick').addEventListener('click', () => {
  editor.picking = !editor.picking;
  $('edPick').classList.toggle('on', editor.picking);
  if (editor.picking && level !== 'building' && editor.building) goBuilding(editor.building);
  toast(editor.picking ? 'Click a point on the model.' : 'Picking off.');
});
['sPosX', 'sPosY', 'sPosZ'].forEach((id, i) => bind(id, e => {
  const s = editor.solutionCfg, b = editor.building; if (!s || !b) return;
  const p = solutionLocal(b, s).toArray();
  p[i] = +e.target.value; s.position = p.map(n => +(+n).toFixed(2));
}));
bind('sNode', e => { const s = editor.solutionCfg; if (!s) return; s.node = e.target.value.trim(); }, 'change');
$('edSnapNode').addEventListener('click', () => {
  const s = editor.solutionCfg, b = editor.building; if (!s || !b) return;
  if (!s.node || !b.detailObj.getObjectByName(s.node)) return toast('No empty named "' + (s.node || '') + '" in the model.');
  s.position = null; editor.syncSolution(); toast('Marker follows ' + s.node + ' again.');
});
$('edGrabSolution').addEventListener('click', () => {
  const s = editor.solutionCfg, b = editor.building;
  if (!s || !b) return toast('Pick a solution first.');
  const a = camAngles();
  const t = b.group.worldToLocal(controls.target.clone());
  s.view = {
    azimuth: Math.round(a.az),
    elevation: Math.round(a.el),
    frustum: Math.round(frustum / camera.zoom),
    target: [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)]
  };
  editor.syncSolution();
  toast('View stored for solution ' + s.number + '.');
});
$('edClearSolution').addEventListener('click', () => {
  const s = editor.solutionCfg; if (!s) return;
  delete s.view;
  editor.syncSolution(); toast('View cleared.');
});
function editSolutionView(patch) {
  const s = editor.solutionCfg, b = editor.building;
  if (!s || !b) return;
  if (!s.view) {
    const t = b.group.worldToLocal(solutionWorld(b, s).clone());
    s.view = { target: [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)] };
  }
  Object.assign(s.view, patch);
  editor.syncSolution();
  if (activeSolution === s) focusSolution(b, s);
}
bind('svAz', e => { $('v_svAz').textContent = Math.round(e.target.value) + '°'; editSolutionView({ azimuth: +e.target.value }); });
bind('svEl', e => { $('v_svEl').textContent = Math.round(e.target.value) + '°'; editSolutionView({ elevation: +e.target.value }); });
bind('svFr', e => { $('v_svFr').textContent = Math.round(e.target.value); editSolutionView({ frustum: +e.target.value }); });

bind('sNumber', e => { const s = editor.solutionCfg; if (!s) return; s.number = +e.target.value || 1; buildMarkers(); editor.syncSolutionList(); });
bind('sLabel', e => { const s = editor.solutionCfg; if (!s) return; s.label = e.target.value; buildMarkers(); });
bind('sTitle', e => { const s = editor.solutionCfg; if (!s) return; s.title = e.target.value; editor.syncSolutionList(); if (activeSolution === s) previewTitle.textContent = s.title; });
bind('sDesc', e => { const s = editor.solutionCfg; if (!s) return; s.description = e.target.value; if (activeSolution === s) previewCopy.textContent = s.description; });
bind('sBody', e => { const s = editor.solutionCfg; if (!s) return; s.body = e.target.value.split('\n').filter(x => x.trim()); });
bind('sSketchfab', e => { const s = editor.solutionCfg; if (!s) return; s.sketchfab = e.target.value.trim(); }, 'change');
bind('sProvName', e => { const s = editor.solutionCfg; if (!s) return; (s.provider = s.provider || {}).name = e.target.value; });
bind('sProvNote', e => { const s = editor.solutionCfg; if (!s) return; (s.provider = s.provider || {}).note = e.target.value; });
bind('sProvUrl', e => { const s = editor.solutionCfg; if (!s) return; (s.provider = s.provider || {}).url = e.target.value.trim(); }, 'change');
bind('sDetailsUrl', e => { const s = editor.solutionCfg; if (!s) return; s.detailsUrl = e.target.value.trim(); }, 'change');
bind('sAnim', e => { const s = editor.solutionCfg; if (!s) return; (s.animation = s.animation || {}).clip = e.target.value; if (activeSolution === s) selectSolution(editor.building, s); }, 'change');
bind('sAnimLabel', e => { const s = editor.solutionCfg; if (!s) return; (s.animation = s.animation || {}).label = e.target.value; });

$('edAddSolution').addEventListener('click', () => {
  const b = editor.building; if (!b) return;
  const nums = b.cfg.solutions.map(s => s.number);
  b.cfg.solutions.push({
    number: (nums.length ? Math.max(...nums) : 0) + 1, node: '', position: null,
    label: 'New solution', title: 'New solution',
    description: 'Describe what the user sees here.', body: [], specs: [],
    sketchfab: '', provider: { name: '', note: '', url: '' }, detailsUrl: '',
    animation: { clip: '', label: 'Play animation' }
  });
  buildMarkers(); editor.sIndex = b.cfg.solutions.length - 1;
  editor.syncSolutionList(); editor.syncSolution();
  if (level !== 'building') goBuilding(b);
  toast('Solution added. Use "Click a point on the model" to place it.');
});
$('edRemoveSolution').addEventListener('click', () => {
  const b = editor.building; if (!b || !b.cfg.solutions.length) return;
  b.cfg.solutions.splice(editor.sIndex, 1);
  editor.sIndex = 0; hidePreview(); buildMarkers();
  editor.syncSolutionList(); editor.syncSolution(); toast('Solution removed.');
});

/* Colour swatches sit beside the hex fields and drive the same handler */
const COLOR_FIELDS = ['tBrand', 'tPaper', 'tSkyTop', 'tSkyBottom', 'gColor', 'bgColor', 'matColor', 'matEmissive', 'pColor'];
COLOR_FIELDS.forEach(id => {
  const tx = $(id), sw = $(id + 'Sw');
  if (!tx || !sw) return;
  sw.addEventListener('input', () => {
    tx.value = sw.value.toUpperCase();
    tx.dispatchEvent(new Event('change', { bubbles: true }));
  });
  tx.addEventListener('change', () => {
    const v = (tx.value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) sw.value = v.toLowerCase();
  });
});

/* Size, move and turn a whole object from the model */
function editObj(fn) {
  const n = editor.objName; if (!n) return;
  CONFIG.nodeTransforms = CONFIG.nodeTransforms || {};
  const t = CONFIG.nodeTransforms[n] || (CONFIG.nodeTransforms[n] = {});
  fn(t);
  applyAllNodeTransforms();
  editor.refreshView();
}
bind('objSelect', e => { editor.objName = e.target.value; editor.syncObjects(); }, 'change');
bind('objScale', e => { $('v_objScale').textContent = (+e.target.value).toFixed(2); editObj(t => t.scale = +e.target.value); });
['objPosX', 'objPosY', 'objPosZ'].forEach((id, i) => bind(id, e => editObj(t => { t.position = t.position || [0, 0, 0]; t.position[i] = +e.target.value; })));
['objRotX', 'objRotY', 'objRotZ'].forEach((id, i) => bind(id, e => editObj(t => { t.rotation = t.rotation || [0, 0, 0]; t.rotation[i] = +e.target.value; })));
$('edObjReset').addEventListener('click', () => {
  const n = editor.objName;
  if (!n || !CONFIG.nodeTransforms || !CONFIG.nodeTransforms[n]) return toast('That object is already as exported.');
  delete CONFIG.nodeTransforms[n];
  applyAllNodeTransforms(); editor.refreshView(); editor.syncObjects();
  toast(n + ' back to the exported size.');
});

/* How the move plays */
bind('trCamEase', e => { CONFIG.transitions.camEase = e.target.value; }, 'change');
bind('trFadeMode', e => { CONFIG.transitions.fadeMode = e.target.value; }, 'change');

/* Scene: model, surroundings, backdrop */
$('edModelPick').addEventListener('click', () => $('modelFile').click());
$('edModelDir').addEventListener('click', () => $('modelDir').click());
async function handleModelPick(files) {
  if (!files || !files.length) return;
  toast('Reading the model, one moment.');
  try {
    const res = await loadModelFiles(files);
    pendingFiles = res.buf ? null : { entry: res.entry, byName: res.byName };
    adoptModel(res.gltf, res.buf, !res.buf);
    editor.matName = null; editor.objName = null;
    editor.syncAll();
    toast('Loaded ' + res.name + '. ' + (missingNodes.length
      ? 'Now say what each level shows.'
      : 'Ready.'));
  } catch (err) {
    console.error(err);
    const msg = (err && /No \.glb/.test(String(err.message || ''))) ? err.message
      : modelErrorText(err, files.length);
    toast(msg);
    if ($('modelInfo')) $('modelInfo').textContent = msg;
  }
}
// FileList is live, so it has to be copied before the input is cleared
$('modelFile').addEventListener('change', e => { const f = Array.from(e.target.files || []); e.target.value = ''; handleModelPick(f); });
$('modelDir').addEventListener('change', e => { const f = Array.from(e.target.files || []); e.target.value = ''; handleModelPick(f); });
bind('mTerrain', e => { CONFIG.model.terrainNode = e.target.value.trim(); attachTerrain(); }, 'change');

bind('envSource', e => { CONFIG.environment.source = e.target.value; buildEnvironment(); }, 'change');
bind('envSize', e => { $('v_envSize').textContent = e.target.value; });
$('edEnvPick').addEventListener('click', () => $('envFile').click());
$('envFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  toast('Preparing the surroundings.');
  try {
    const res = await environmentFileToDataUrl(file, +$('envSize').value);
    CONFIG.environment.image = res.url;
    CONFIG.environment.source = 'image';
    $('envSource').value = 'image';
    buildEnvironment();
    $('envInfo').textContent = 'Loaded at ' + res.w + ' by ' + res.h + ', about ' + Math.round(res.url.length / 1365) + ' KB in the file.';
    toast('Surroundings updated.');
  } catch (err) { console.error(err); toast(err.message || 'That file could not be used.'); }
});
$('edEnvClear').addEventListener('click', () => {
  CONFIG.environment.image = ''; CONFIG.environment.source = 'gradient';
  $('envSource').value = 'gradient';
  buildEnvironment(); editor.syncScene(); toast('Back to the built in sky.');
});
bind('envRot', e => { CONFIG.environment.rotation = +e.target.value; $('v_envRot').textContent = e.target.value + '°'; applyBackground(); });
bind('bgMode', e => { CONFIG.environment.background = e.target.value; applyBackground(); }, 'change');
bind('bgBlur', e => { CONFIG.environment.backgroundBlur = +e.target.value; $('v_bgBlur').textContent = (+e.target.value).toFixed(2); applyBackground(); });
bind('bgInt', e => { CONFIG.environment.backgroundIntensity = +e.target.value; $('v_bgInt').textContent = (+e.target.value).toFixed(2); applyBackground(); });
bind('bgSpread', e => { CONFIG.environment.spread = +e.target.value; $('v_bgSpread').textContent = (+e.target.value).toFixed(2); updateSky(); });

/* Backdrop colour and its own picture */
bind('bgColor', e => {
  const v = e.target.value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { CONFIG.environment.backgroundColor = v; applyBackground(); }
}, 'change');
$('edBgPick').addEventListener('click', () => $('bgFile').click());
$('bgFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  toast('Preparing the backdrop.');
  try {
    const res = await imageToDataUrl(file, +($('envSize') ? $('envSize').value : 1024));
    CONFIG.environment.backdropImage = res.url;
    CONFIG.environment.background = 'environment';
    $('bgMode').value = 'environment';
    skyTexKey = null;
    applyBackground(); editor.syncScene();
    toast('Backdrop set, ' + Math.round(res.url.length / 1365) + ' KB.');
  } catch (err) { toast(err.message || 'That picture could not be used.'); }
});
$('edBgClear').addEventListener('click', () => {
  CONFIG.environment.backdropImage = '';
  skyTexKey = null;
  applyBackground(); editor.syncScene();
  toast('Backdrop follows the surrounding picture again.');
});

/* Extra objects */
function addProp(shape) {
  CONFIG.props = CONFIG.props || [];
  const t = controls.target;
  CONFIG.props.push({
    id: 'p' + (CONFIG.props.length + 1), shape, node: '',
    position: [+t.x.toFixed(1), 0, +t.z.toFixed(1)],
    rotation: [0, 0, 0],
    scale: shape === 'box' ? 20 : 400,
    color: '#B9C4CC'
  });
  editor.pIndex = CONFIG.props.length - 1;
  buildProps(); editor.syncProps();
  toast((shape === 'box' ? 'Box' : 'Plane') + ' added at the middle of the view.');
}
$('edAddPlane').addEventListener('click', () => addProp('plane'));
$('edAddBox').addEventListener('click', () => addProp('box'));
$('edRemoveProp').addEventListener('click', () => {
  if (!CONFIG.props || !CONFIG.props.length) return;
  CONFIG.props.splice(editor.pIndex, 1);
  editor.pIndex = 0; buildProps(); editor.syncProps(); toast('Removed.');
});
function editProp(fn) {
  const c = editor.propCfg; if (!c) return;
  fn(c); buildProps();
}
bind('pNode', e => { editProp(c => c.node = e.target.value.trim()); editor.syncProps(); }, 'change');
['pPosX', 'pPosY', 'pPosZ'].forEach((id, i) => bind(id, e => editProp(c => { c.position = c.position || [0, 0, 0]; c.position[i] = +e.target.value; })));
['pRotX', 'pRotY', 'pRotZ'].forEach((id, i) => bind(id, e => editProp(c => { c.rotation = c.rotation || [0, 0, 0]; c.rotation[i] = +e.target.value; })));
bind('pScale', e => { $('v_pScale').textContent = (+e.target.value).toFixed(1); editProp(c => c.scale = +e.target.value); });
bind('pColor', e => {
  const v = e.target.value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) editProp(c => c.color = v);
}, 'change');

/* Render style */
bind('pTone', e => { CONFIG.post.toneMapping = e.target.value; applyPost(); }, 'change');
bind('pEnabled', e => { CONFIG.post.enabled = e.target.checked; applyPost(); if (e.target.checked) toast('Loading the extra passes.'); }, 'change');
bind('pBloom', e => { CONFIG.post.bloom = +e.target.value; $('v_pBloom').textContent = (+e.target.value).toFixed(2); applyPost(); });
bind('pThresh', e => { CONFIG.post.bloomThreshold = +e.target.value; $('v_pThresh').textContent = (+e.target.value).toFixed(2); applyPost(); });
bind('pRadius', e => { CONFIG.post.bloomRadius = +e.target.value; $('v_pRadius').textContent = (+e.target.value).toFixed(2); applyPost(); });
bind('pVig', e => { CONFIG.post.vignette = +e.target.value; $('v_pVig').textContent = (+e.target.value).toFixed(2); applyPost(); });

/* Sun, shadows and exposure */
function bindLight(id, key, labelId, fmt, after) {
  bind(id, e => {
    CONFIG.lighting[key] = +e.target.value;
    if (labelId) $(labelId).textContent = fmt ? fmt(e.target.value) : e.target.value;
    applyLighting();
    if (after) after();
  });
}
bindLight('sunAz', 'sunAzimuth', 'v_sunAz', x => x + '°');
bindLight('sunEl', 'sunElevation', 'v_sunEl', x => x + '°');
bindLight('sunI', 'sunIntensity', 'v_sunI', x => Number(x).toFixed(2));
bindLight('skyI', 'skyIntensity', 'v_skyI', x => Number(x).toFixed(2));
bindLight('ambI', 'ambientIntensity', 'v_ambI', x => Number(x).toFixed(2));
bindLight('envI', 'environmentIntensity', 'v_envI', x => Number(x).toFixed(2));
// keep the sky brightness in step when the reflection strength moves
bind('envI', () => { scene.environmentIntensity = CONFIG.lighting.environmentIntensity; });
bindLight('expo', 'exposure', 'v_expo', x => Number(x).toFixed(2));
bind('shQuality', e => { CONFIG.shadows.quality = e.target.value; applyShadows(); }, 'change');
bind('shRes', e => { CONFIG.shadows.resolution = +e.target.value; applyShadows(); }, 'change');
bind('shSpread', e => { CONFIG.shadows.spread = +e.target.value; $('v_shSpread').textContent = (+e.target.value).toFixed(2); aimSun(); renderer.shadowMap.needsUpdate = true; });
bind('shNb', e => { CONFIG.shadows.normalBias = +e.target.value; $('v_shNb').textContent = (+e.target.value).toFixed(2); sun.shadow.normalBias = +e.target.value; renderer.shadowMap.needsUpdate = true; });

/* Surfaces */
$('edPickMat').addEventListener('click', () => {
  editor.matPicking = !editor.matPicking;
  $('edPickMat').classList.toggle('on', editor.matPicking);
  toast(editor.matPicking ? 'Click any surface in the scene.' : 'Surface picking off.');
});
bind('matSelect', e => { editor.matName = e.target.value; editor.syncMaterials(); }, 'change');
bind('matColor', e => {
  const v = e.target.value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) editor.editMaterial({ color: v });
}, 'change');
bind('matRough', e => { $('v_matRough').textContent = (+e.target.value).toFixed(2); editor.editMaterial({ roughness: +e.target.value }); });
bind('matMetal', e => { $('v_matMetal').textContent = (+e.target.value).toFixed(2); editor.editMaterial({ metalness: +e.target.value }); });
bind('matOpacity', e => {
  const v = +e.target.value; $('v_matOpacity').textContent = v.toFixed(2);
  editor.editMaterial(v < 0.999 ? { opacity: v, transparent: true } : { opacity: v });
});
bind('matEmissive', e => {
  const v = e.target.value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) editor.editMaterial({ emissive: v });
}, 'change');
bind('matEmisI', e => { $('v_matEmisI').textContent = (+e.target.value).toFixed(2); editor.editMaterial({ emissiveIntensity: +e.target.value }); });
bind('matNormal', e => { $('v_matNormal').textContent = (+e.target.value).toFixed(2); editor.editMaterial({ normalScale: +e.target.value }); });
bind('matAo', e => { $('v_matAo').textContent = (+e.target.value).toFixed(2); editor.editMaterial({ aoMapIntensity: +e.target.value }); });
bind('matTransparent', e => editor.editMaterial({ transparent: e.target.checked }), 'change');
bind('matDouble', e => editor.editMaterial({ doubleSided: e.target.checked }), 'change');
bind('texSize', e => { $('v_texSize').textContent = e.target.value; });
$('edTexPick').addEventListener('click', () => { if (editor.matName) $('texFile').click(); else toast('Pick a material first.'); });
$('texFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !editor.matName) return;
  const slot = $('texSlot').value;
  toast('Preparing the image.');
  try {
    const res = await imageToDataUrl(file, +$('texSize').value);
    editor.editMaterial({ [slot]: res.url });
    $('texInfo').textContent = 'Replaced at ' + res.w + ' by ' + res.h + ', about ' +
      Math.round(res.url.length / 1365) + ' KB added to the file.';
    toast('Texture replaced.');
  } catch (err) { toast(err.message || 'Could not use that image.'); }
});
$('edTexClear').addEventListener('click', () => {
  if (!editor.matName) return;
  const slot = $('texSlot').value;
  const over = CONFIG.materials[editor.matName];
  if (!over || !over[slot]) return toast('That texture is already the exported one.');
  delete over[slot];
  if (!Object.keys(over).length) delete CONFIG.materials[editor.matName];
  applyMaterials(); editor.syncMaterials(); toast('Exported texture restored.');
});
bind('texSlot', () => editor.syncMaterials(), 'change');
$('edResetMat').addEventListener('click', () => {
  if (!editor.matName) return;
  delete CONFIG.materials[editor.matName];
  applyMaterials(); editor.syncMaterials(); toast('Material back to the exported values.');
});

/* Text and colours */
const textMap = {
  tTitle: 'title', tSubtitle: 'subtitle', tHintCity: 'hintCity', tHintBuilding: 'hintBuilding',
  tBack: 'back', tExplore: 'explore', tProvider: 'provider', tDetails: 'details'
};
Object.entries(textMap).forEach(([id, key]) => bind(id, e => { CONFIG.text[key] = e.target.value; applyText(); }));
const colorMap = { tBrand: 'brand', tPaper: 'paper', tSkyTop: 'skyTop', tSkyBottom: 'skyBottom' };
Object.entries(colorMap).forEach(([id, key]) => bind(id, e => {
  const v = e.target.value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { CONFIG.colors[key] = v; applyColors(); }
}, 'change'));

/* Ground and massing */
bind('gColor', e => {
  const v = e.target.value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { CONFIG.ground.color = v; regroundAndRebuild(); }
}, 'change');
bind('gRough', e => { CONFIG.ground.roughness = +e.target.value; $('v_gRough').textContent = (+e.target.value).toFixed(2); regroundAndRebuild(); });
bind('gVisible', e => { CONFIG.ground.visible = e.target.checked; applyGroundVisibility(); }, 'change');
bind('gUseModel', e => { CONFIG.ground.useModelMaterial = e.target.checked; regroundAndRebuild(); }, 'change');
bind('cOpaque', e => { CONFIG.cityShape.forceOpaque = e.target.checked; rebuild(); }, 'change');
function regroundAndRebuild() { attachTerrain(); }

/* ---- saving a new copy of this file ---------------------------------------
   The small script at the very bottom of the page stores the file exactly as
   it was loaded. Splicing the current settings into that copy produces a
   complete HTML file, so editing never needs copy and paste. */
/* These search strings are assembled from pieces on purpose. If they were
   written out in full they would also match themselves inside this function,
   which sits earlier in the file than the things it is looking for, and the
   rewrite would land in the wrong place. */
const FIND_CONFIG = 'const CONFIG' + ' = {';
const FIND_CONFIG_END = '/* ===== CONFIG' + ' END';
const FIND_MODEL_SLOT = new RegExp('const EMBEDDED_' + "MODEL = '[^']*';");

function buildUpdatedHtml(text) {
  const src = window.__PAGE_SRC;
  if (!src) return null;
  const a = src.indexOf(FIND_CONFIG);
  const b = src.indexOf(FIND_CONFIG_END);
  if (a < 0 || b < 0 || b <= a) return null;
  return src.slice(0, a) + text + '\n' + src.slice(b);
}
/* Turns the separate .glb into base64 so a saved file can stand on its own. */
async function modelAsBase64() {
  try {
    const buf = await (await fetch(modelUrl)).arrayBuffer();
    const bytes = new Uint8Array(buf); let out = ''; const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(out);
  } catch (err) { console.error(err); return null; }
}
/* A saved file that does not parse is a dead end, so the generated settings
   are executed once here before anything is written to disk. */
function configError(text) {
  try { new Function('"use strict";' + text + '\nreturn CONFIG;')(); return null; }
  catch (err) { return err.message || String(err); }
}
/* ---- a viewer only copy --------------------------------------------------
   Removes the edit panel entirely: its styles, its markup, its code and the
   copy of the page source that only the panel needs. The result is a smaller,
   lighter file for publishing. Keep the editable file and a settings file if
   you want to make more changes later.
   The markers are assembled from pieces so they cannot match themselves. */
const M_CSS_A = '/* ==== PANEL STYLES' + ' START ====', M_CSS_B = '/* ==== PANEL STYLES' + ' END ==== */';
const M_UI_A = '<!-- ==== PANEL MARKUP' + ' START ==== -->', M_UI_B = '<!-- ==== PANEL MARKUP' + ' END ==== -->';
const M_JS_A = '/* ==== PANEL CODE' + ' START ==== */', M_JS_B = '/* ==== PANEL CODE' + ' END ==== */';
const M_SRC_A = '<!-- ==== PAGE SOURCE' + ' START ==== -->';
const VIEWER_STUB = [
  '/* The edit panel was removed from this copy. These stand in for the few',
  '   places the viewer refers to it. */',
  'const editor={on:false,picking:false,matPicking:false,dragging:false,bIndex:0,sIndex:0,',
  '  toggle(){},open(){},close(){},syncAll(){},syncScene(){},syncSolution(){},syncMaterials(){},',
  '  setMarker(){},setMaterialByName(){return false;},',
  '  get building(){return buildings[0]||null;}};',
  'function toast(){}',
  'window.editorSyncSolution=function(){};'
].join('\n');
function cutBlock(str, a, b, replacement) {
  const i = str.indexOf(a), j = str.indexOf(b);
  if (i < 0 || j < 0 || j < i) return null;
  return str.slice(0, i) + (replacement || '') + str.slice(j + b.length);
}
/* The page source block cannot be cut with a closing marker, because the
   script that takes the snapshot sits inside the block: at the moment it runs,
   the parser has not reached the closing comment yet, so that comment is not
   in the snapshot at all. Cut to the end of the script tag instead. The tag
   name is split so this line cannot end the script it lives in. */
function cutPageSource(str) {
  const i = str.indexOf(M_SRC_A);
  if (i < 0) return null;
  const close = '</scr' + 'ipt>';
  const j = str.indexOf(close, i);
  if (j < 0) return null;
  return str.slice(0, i) + str.slice(j + close.length);
}
function stripEditor(html) {
  let out = cutBlock(html, M_CSS_A, M_CSS_B, '');
  if (out) out = cutBlock(out, M_UI_A, M_UI_B, '');
  if (out) out = cutBlock(out, M_JS_A, M_JS_B, VIEWER_STUB);
  if (out) { const s2 = cutPageSource(out); if (s2) out = s2; }
  return out;
}
function currentFileName() {
  const n = decodeURIComponent((location.pathname.split('/').pop() || '').trim());
  return /\.html?$/i.test(n) ? n : 'DPR_RESILIENCE_CITY.html';
}
async function doSave(viewerOnly) {
  const text = editor.exportText();
  const bad = configError(text);
  if (bad) {
    $('edOutText').value = '/* These settings did not pass the check, so nothing was\n   saved. Please report this message:\n\n   ' + bad + '\n*/\n\n' + text;
    $('edOut').classList.add('open');
    toast('Nothing saved. The settings did not pass the check.');
    return;
  }
  let html = buildUpdatedHtml(text);
  if (!html) {
    $('edOutText').value = text;
    $('edOut').classList.add('open');
    toast('Could not rewrite the file. Copy the settings instead.');
    return;
  }
  if (pendingExport && !pendingModelB64) {
    toast('Packing the loaded glTF into a single file, one moment.');
    let packed = null;
    if (pendingFiles) {
      try { packed = await repackGltfToGlb(pendingFiles.entry, pendingFiles.byName); }
      catch (err) { console.warn('Repack failed, falling back to the exporter.', err); }
    }
    if (!packed) {
      try { packed = await templateAsGlb(); }
      catch (err) {
        console.error(err);
        toast('The loaded glTF could not be packed. Nothing saved.');
        return;
      }
    }
    pendingModelB64 = bytesToBase64(packed);
    pendingExport = null;
    editor.syncScene();
  }
  if (pendingModelB64) {
    const filled = html.replace(FIND_MODEL_SLOT, 'const EMBEDDED_' + "MODEL = '" + pendingModelB64 + "';");
    if (filled.length > html.length + pendingModelB64.length / 2) html = filled;
    else toast('Could not place the loaded model in the file.');
  }
  else if ($('saveEmbed') && $('saveEmbed').checked && !EMBEDDED_MODEL) {
    toast('Reading the model into the file, one moment.');
    const b64 = await modelAsBase64();
    if (b64) {
      const filled = html.replace(FIND_MODEL_SLOT, 'const EMBEDDED_' + "MODEL = '" + b64 + "';");
      if (filled.length > html.length + b64.length / 2) { html = filled; }
      else { toast('Could not place the model in the file. Saving without it.'); }
    }
    else toast('Could not read the model. Saving without it.');
  }
  if (viewerOnly) {
    const lean = stripEditor(html);
    if (lean) html = lean;
    else { viewerOnly = false; toast('Could not remove the panel. Saving the editable file instead.'); }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = viewerOnly ? currentFileName().replace(/\.html?$/i, '') + '_VIEWER.html' : currentFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  const kb = Math.round(html.length / 1024);
  const size = kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb + ' KB';
  toast('Saved ' + a.download + ', ' + size + (viewerOnly ? ', viewer only.' : '.'));
  const note = $(viewerOnly ? 'saveInfoViewer' : 'saveInfoEdit');
  if (note) note.textContent = 'Last saved as ' + a.download + ', ' + size + '.';
}
$('edSave').addEventListener('click', () => doSave(false));
$('edSaveTab').addEventListener('click', () => doSave(false));
$('edExportViewer').addEventListener('click', () => doSave(true));
$('edExportViewerFoot').addEventListener('click', () => doSave(true));

/* ---- settings files, for keeping several versions ------------------------ */
const SETTINGS_FORMAT = 'dpr-resilience-city/1';
function settingsFileName() {
  const n = (CONFIG.text.title || 'settings').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-');
  return (n || 'settings') + '.dprset.json';
}
$('edSettingsSave').addEventListener('click', () => {
  const bad = configError(editor.exportText());
  if (bad) return toast('Nothing written. The settings did not pass the check.');
  const payload = {
    format: SETTINGS_FORMAT,
    name: CONFIG.text.title || '',
    savedAt: new Date().toISOString(),
    note: 'Settings for the DPR Resilience City viewer. Load this with Load settings in the edit panel. The 3D model is not included.',
    config: JSON.parse(JSON.stringify(CONFIG))
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = settingsFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 6000);
  toast('Saved ' + a.download + '.');
});
$('edSettingsLoad').addEventListener('click', () => $('settingsFile').click());
$('settingsFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const incoming = raw && raw.config ? raw.config : raw;
    if (incoming && incoming.format) delete incoming.format;
    if (!incoming || !incoming.buildings || !incoming.text) throw new Error('That file is not a settings file for this viewer.');
    applySettings(incoming);
    toast('Loaded ' + (raw.name ? ('"' + raw.name + '"') : file.name) + '.');
  } catch (err) { console.error(err); toast(err.message || 'That file could not be read.'); }
});
/* Replaces the live settings wholesale, then rebuilds everything that depends
   on them. Keys the file does not mention keep their current value, so an
   older settings file still loads after new options are added. */
function applySettings(incoming) {
  Object.keys(incoming).forEach(k => {
    if (incoming[k] && typeof incoming[k] === 'object' && !Array.isArray(incoming[k]) && CONFIG[k] && typeof CONFIG[k] === 'object' && !Array.isArray(CONFIG[k]))
      Object.assign(CONFIG[k], incoming[k]);
    else CONFIG[k] = incoming[k];
  });
  applyColors();
  applyPost();
  rebuild();
  buildProps();
  applyLighting();
  applyShadows();
  applyGroundVisibility();
  applyText();
  editor.bIndex = 0; editor.sIndex = 0; editor.matName = null;
  editor.syncAll();
}

/* Export */
$('edExport').addEventListener('click', () => { $('edOutText').value = editor.exportText(); $('edOut').classList.add('open'); });
$('edOutClose').addEventListener('click', () => $('edOut').classList.remove('open'));
$('edCopy').addEventListener('click', async () => {
  const ta = $('edOutText');
  try { await navigator.clipboard.writeText(ta.value); toast('Copied.'); }
  catch (err) { ta.removeAttribute('readonly'); ta.select(); document.execCommand('copy'); ta.setAttribute('readonly', ''); toast('Copied.'); }
});
$('edDownload').addEventListener('click', () => {
  const blob = new Blob([$('edOutText').value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'DPR_CONFIG.txt'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('edReset').addEventListener('click', () => { if (confirm('Discard every change made since the page was opened?')) location.reload(); });
/* ==== PANEL CODE END ==== */


/* ============================================================================
   BOOT
   ============================================================================ */
function rebuild() {
  buildCity(); buildMarkers();
  if (template) prewarm();
  if (level === 'building') {
    const b = buildings[Math.min(editor.bIndex, buildings.length - 1)];
    if (b) goBuilding(b, false); else goCity(false);
  } else goCity(false);
}

/* If a base64 GLB is pasted between the quotes below, it is used instead of
   CONFIG.model.url and this HTML file becomes fully self-contained. The
   two file version leaves it empty and loads DPR_CITY.glb from the folder. */
const EMBEDDED_MODEL = ''; // Development uses public/models/DPR_CITY.glb

/* Blender's exporter can compress meshes, and textures can be KTX2. Each of
   those needs its own decoder, otherwise GLTFLoader simply refuses the file.
   They are attached lazily, so a plain model downloads none of them. */
let decoderCache = null;
async function attachDecoders(target) {
  if (!decoderCache) {
    decoderCache = {};
    try {
      const m = await import(JSM + 'loaders/DRACOLoader.js/+esm');
      decoderCache.draco = new m.DRACOLoader().setDecoderPath(JSM + 'libs/draco/gltf/');
    } catch (err) { console.warn('Draco decoder unavailable.', err); }
    try {
      const m = await import(JSM + 'libs/meshopt_decoder.module.js/+esm');
      decoderCache.meshopt = m.MeshoptDecoder || m.default;
    } catch (err) { console.warn('Meshopt decoder unavailable.', err); }
    try {
      const m = await import(JSM + 'loaders/KTX2Loader.js/+esm');
      decoderCache.ktx2 = new m.KTX2Loader().setTranscoderPath(JSM + 'libs/basis/').detectSupport(renderer);
    } catch (err) { console.warn('KTX2 decoder unavailable.', err); }
  }
  if (decoderCache.draco && target.setDRACOLoader) target.setDRACOLoader(decoderCache.draco);
  if (decoderCache.meshopt && target.setMeshoptDecoder) target.setMeshoptDecoder(decoderCache.meshopt);
  if (decoderCache.ktx2 && target.setKTX2Loader) target.setKTX2Loader(decoderCache.ktx2);
  return target;
}
/* Turns a loader failure into something a person can act on. */
function modelErrorText(err, fileCount) {
  const raw = String((err && (err.message || err)) || '');
  if (/DRACOLoader/i.test(raw)) return 'This model uses Draco mesh compression and the decoder could not be loaded. Re-export it from Blender with compression off, or check your connection.';
  if (/KTX2|basisu/i.test(raw)) return 'This model uses KTX2 textures and the transcoder could not be loaded. Re-export with ordinary png or jpg textures.';
  if (/meshopt/i.test(raw)) return 'This model uses meshopt compression and the decoder could not be loaded.';
  if (/Unexpected token|JSON|Invalid typed array|Unsupported glTF|Unknown/i.test(raw))
    return fileCount > 1 ? 'Those files could not be read. Check the .bin and every texture are included.'
      : 'That file could not be read as glTF. If it is a .gltf, its .bin and textures have to be selected too.';
  return 'The model could not be loaded: ' + (raw.slice(0, 140) || 'unknown error');
}

const loader = new GLTFLoader();
const modelUrl = EMBEDDED_MODEL
  ? URL.createObjectURL(new Blob([Uint8Array.from(atob(EMBEDDED_MODEL), c => c.charCodeAt(0))], { type: 'model/gltf-binary' }))
  : (new URLSearchParams(location.search).get('model') || CONFIG.model.url);

attachDecoders(loader).catch(() => { }).then(() => {
  loader.load(modelUrl, gltf => {
    if (EMBEDDED_MODEL) URL.revokeObjectURL(modelUrl);
    template = gltf.scene;
    clips = gltf.animations || [];

    attachTerrain();

    applyColors();
    applyPost();
    buildCity();
    applyLighting();
    applyShadows();
    buildMarkers();
    applyText();
    goCity(false);

    prewarm();
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 350);
    requestAnimationFrame(frame);
  },
    xhr => {
      if (xhr.total) loadingBar.style.width = Math.round(xhr.loaded / xhr.total * 100) + '%';
    },
    err => {
      console.error(err);
      loadingText.innerHTML = 'The model could not be loaded.<br><br>' +
        'Keep <b>' + modelUrl + '</b> in the same folder as this HTML file, and open the page through a web server or an LMS rather than straight from the desktop.';
      loadingBar.parentElement.style.display = 'none';
    });
});
