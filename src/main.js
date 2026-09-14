/* ============================================================================
   DPR RESILIENCE CITY
   Application entry point and Three.js runtime.
   Content and scene settings live in config/navigator.config.js.
   ============================================================================ */





/* ============================================================================
   2. ENGINE
   Nothing below here needs editing for normal content changes.
   ============================================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from './config/navigator.config.js';
import { dom } from './ui/dom.js';

const DEG = Math.PI / 180;
const CAM_DIST = 1400;

const {
  app,
  loading,
  loadingText,
  loadingBar,
  buildingHotspots,
  solutionHotspots,
  preview,
  previewKicker,
  previewTitle,
  previewCopy,
  previewNote,
  previewClose,
  playBtn,
  exploreBtn,
  backBtn,
  hint,
  crumbs,
  srStatus,
  modal,
  closeViewerBtn,
  sketchfabFrame,
  viewerTitle,
  viewerKicker,
  viewerBody,
  providerName,
  providerNote,
  providerLink,
  detailsLink,
  specList,
  uiTitle,
  uiSubtitle
} = dom;

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
      import(/* @vite-ignore */ JSM + 'postprocessing/EffectComposer.js/+esm'),
      import(/* @vite-ignore */ JSM + 'postprocessing/RenderPass.js/+esm'),
      import(/* @vite-ignore */ JSM + 'postprocessing/UnrealBloomPass.js/+esm'),
      import(/* @vite-ignore */ JSM + 'postprocessing/ShaderPass.js/+esm'),
      import(/* @vite-ignore */ JSM + 'postprocessing/OutputPass.js/+esm')
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
  uiTitle.textContent = t.title; uiSubtitle.textContent = t.subtitle;
  document.title = t.title.replace(/·/g, '-');
  backBtn.textContent = t.back; exploreBtn.textContent = t.explore;
  providerLink.textContent = t.provider; detailsLink.textContent = t.details;
  viewerKicker.textContent = t.modalKicker;
  hint.textContent = level === 'city' ? t.hintCity : t.hintBuilding;
}
function viewWidth() {
  return Math.max(320, innerWidth);
}
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
  const mod = await import(/* @vite-ignore */ JSM + 'exporters/GLTFExporter.js/+esm');
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
      const mod = await import(/* @vite-ignore */ JSM + 'loaders/HDRLoader.js/+esm');
      loader = new mod.HDRLoader();
    } catch (e) {
      const mod = await import(/* @vite-ignore */ JSM + 'loaders/RGBELoader.js/+esm');
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
      s.addEventListener('click', () => selectSolution(b, sol));
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
}
function placePreview() {
  const p = project(solutionWorld(activeBuilding, activeSolution, _v3));
  if (!p) { preview.style.opacity = '0'; return; }
  preview.style.opacity = '';
  const w = preview.offsetWidth || 330, h = preview.offsetHeight || 210;
  let x = p.x + 28, y = p.y - h * .42;
  if (x + w > innerWidth - 16) x = p.x - w - 28;
  x = Math.max(16, Math.min(x, innerWidth - w - 16));
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

  const moved = Math.hypot(
    e.clientX - downAt.x,
    e.clientY - downAt.y
  );

  downAt = null;

  if (moved > 5 || transition) return;

  if (level === 'city') {
    const building = pickBuilding(e);

    if (building) {
      goBuilding(building);
    }
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (transition) { renderer.domElement.style.cursor = 'default'; return; }
  if (level === 'city') { renderer.domElement.style.cursor = pickBuilding(e) ? 'pointer' : 'grab'; }
});

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

  const busy = Boolean(
    transition ||
    swayUntil > now ||
    animationsRunning()
  );
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
   BOOT
   ============================================================================ */
function rebuild() {
  buildCity(); buildMarkers();
  if (template) prewarm();
  if (level === 'building') {
    const b = activeBuilding || buildings[0];
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
      const m = await import(/* @vite-ignore */ JSM + 'loaders/DRACOLoader.js/+esm');
      decoderCache.draco = new m.DRACOLoader().setDecoderPath(JSM + 'libs/draco/gltf/');
    } catch (err) { console.warn('Draco decoder unavailable.', err); }
    try {
      const m = await import(/* @vite-ignore */ JSM + 'libs/meshopt_decoder.module.js/+esm');
      decoderCache.meshopt = m.MeshoptDecoder || m.default;
    } catch (err) { console.warn('Meshopt decoder unavailable.', err); }
    try {
      const m = await import(/* @vite-ignore */ JSM + 'loaders/KTX2Loader.js/+esm');
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
