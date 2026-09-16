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
import { CONFIG } from './config/navigator.config.js';
import { dom } from './ui/dom.js';
import { createHazardMap } from './ui/hazard-map.js';
import { loadCityModel } from './three/model-loader.js';
import { cleanNodeName, findNodeLoose, hasRenderableNode } from './three/model-nodes.js';

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
  previewTitle,
  previewCopy,
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
let importedObjects = [];
let buildings = [];                 // runtime objects, one per CONFIG.buildings entry
let level = 'city';                 // 'city' | 'building'
let activeBuilding = null;
let activeSolution = null;
let transition = null;              // {from,to,start,duration}
let frustum = CONFIG.cityView.frustum;
let swayUntil = 0, swayBuilding = null;
let hazardAreaVisible = true;

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
  backBtn.textContent = t.backMap; exploreBtn.textContent = t.explore;
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
function isDefaultMaterial(material) {
  return Boolean(
    material && !material.name && !material.map &&
    material.metalness === 1 && material.roughness === 1
  );
}
function neutralMaterial() {
  const config = CONFIG.noMaterial || {};
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.color || '#C7D0D7'),
    roughness: config.roughness == null ? 0.92 : config.roughness,
    metalness: config.metalness == null ? 0 : config.metalness
  });
  rememberDisplayMaterial(material);
  return material;
}
let maxAnisotropy = 0;
function applyAnisotropy(material) {
  if (!material) return;
  if (!maxAnisotropy) maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const requested = (CONFIG.render && CONFIG.render.anisotropy) || maxAnisotropy;
  const value = Math.max(1, Math.min(maxAnisotropy, requested));
  ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap']
    .forEach(key => {
      const texture = material[key];
      if (texture && texture.anisotropy !== value) {
        texture.anisotropy = value;
        texture.needsUpdate = true;
      }
    });
}
function rememberDisplayMaterial(material) {
  material.userData._t0 = Boolean(material.transparent);
  material.userData._displayOpacity = material.opacity;
  material.userData._displayTransparent = Boolean(material.transparent);
  material.userData._displayDepthWrite = material.depthWrite;
}
function prepareBranch(obj, opts) {
  const forceOpaque = opts && opts.forceOpaque;
  obj.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; }
    if (!o.material) return;
    const map = m => {
      if (isDefaultMaterial(m)) return neutralMaterial();
      const n = m.clone();
      if (forceOpaque) {
        n.transparent = false; n.opacity = 1; n.depthWrite = true;
        n.side = THREE.FrontSide; n.alphaTest = 0; n.alphaMap = null;
      }
      rememberDisplayMaterial(n);
      applyAnisotropy(n);
      return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(map) : map(o.material);
  });
}
function groundMaterialFor(material) {
  if (CONFIG.ground.useModelMaterial !== false && material && !isDefaultMaterial(material)) {
    const clone = material.clone();
    rememberDisplayMaterial(clone);
    applyAnisotropy(clone);
    return clone;
  }
  const ground = new THREE.MeshStandardMaterial({
    color: new THREE.Color(CONFIG.ground.color),
    roughness: CONFIG.ground.roughness,
    metalness: 0
  });
  rememberDisplayMaterial(ground);
  return ground;
}
/* The exported ground plane carries no material, so glTF hands us the default
   fully metallic one. Give it something that reads as ground. */
function prepareGround(obj) {
  obj.visible = CONFIG.ground.visible !== false;
  obj.traverse(o => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    o.castShadow = false; o.receiveShadow = true;
    o.material = Array.isArray(o.material)
      ? o.material.map(groundMaterialFor)
      : groundMaterialFor(o.material);
  });
}
function normalizeTextureName(value) {
  if (!value) return '';
  const raw = String(value).replace(/\\/g, '/').split(/[?#]/, 1)[0];
  const basename = raw.slice(raw.lastIndexOf('/') + 1);
  return basename
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function textureNames(texture) {
  if (!texture) return [];
  const image = texture.image;
  const sourceData = texture.source && texture.source.data;
  return [texture.name, image && image.name, image && image.src, sourceData && sourceData.name, sourceData && sourceData.src]
    .map(normalizeTextureName)
    .filter(Boolean);
}
function terrainMaterials(callback) {
  if (!terrain) return;
  terrain.traverse(object => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(callback);
  });
}
const terrainTextureVisibilityUniforms = new Set();
const TERRAIN_MAP_FRAGMENT = `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);

  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif

  sampledDiffuseColor = mix(
    vec4(1.0),
    sampledDiffuseColor,
    dsnMapVisibility
  );

  diffuseColor *= sampledDiffuseColor;
#endif`;
function installTerrainTextureFade() {
  const configured = (CONFIG.ground.hideTexturesInBuilding || []).map(normalizeTextureName).filter(Boolean);
  const matched = new Set();
  terrainMaterials(material => {
    if (!material.map || !textureNames(material.map).some(name => configured.includes(name))) return;
    configured.forEach(name => {
      if (textureNames(material.map).includes(name)) matched.add(name);
    });
    let visibility = material.userData._dsnMapVisibility;
    if (!visibility) {
      visibility = material.userData._dsnMapVisibility = { value: 1 };
      const previousOnBeforeCompile = material.onBeforeCompile;
      const previousCacheKey = material.customProgramCacheKey;
      material.onBeforeCompile = shader => {
        if (previousOnBeforeCompile) previousOnBeforeCompile(shader);
        shader.uniforms.dsnMapVisibility = visibility;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <map_fragment>', TERRAIN_MAP_FRAGMENT)
          .replace('void main() {', 'uniform float dsnMapVisibility;\nvoid main() {');
      };
      material.customProgramCacheKey = () =>
        (typeof previousCacheKey === 'function' ? previousCacheKey.call(material) : '') +
        '|dsn-terrain-map-visibility';
      material.needsUpdate = true;
    }
    terrainTextureVisibilityUniforms.add(visibility);
  });
  if (import.meta.env.DEV) {
    (CONFIG.ground.hideTexturesInBuilding || []).forEach((name, index) => {
      if (!matched.has(configured[index])) console.warn('[DSN] Terrain texture not found: ' + name);
    });
  }
}
function setTerrainTextureVisibility(value) {
  terrainTextureVisibilityUniforms.forEach(uniform => { uniform.value = value; });
}
function setOpacity(obj, v, noDepth) {
  const factor = THREE.MathUtils.clamp(v, 0, 1);
  eachMaterial(obj, m => {
    const baseOpacity = m.userData._displayOpacity == null ? m.opacity : m.userData._displayOpacity;
    const baseTransparent = m.userData._displayTransparent == null ? Boolean(m.userData._t0) : m.userData._displayTransparent;
    const baseDepthWrite = m.userData._displayDepthWrite == null ? true : m.userData._displayDepthWrite;
    const opacity = baseOpacity * factor;
    m.opacity = opacity;
    m.transparent = factor < 0.999 || opacity < 0.999 ? true : baseTransparent;
    m.depthWrite = noDepth || factor < 0.999 ? false : baseDepthWrite;
    m.needsUpdate = true;
  });
}
function worldBox(obj) { obj.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(obj); }

function contextPartObjects(building) {
  if (!building || !building.detailObj) return [];
  return (building.cfg.contextParts || [])
    .map(name => findNodeLoose(building.detailObj, name))
    .filter(Boolean);
}
function surroundingsConfig() {
  const config = CONFIG.surroundings || {};
  return {
    mode: config.mode === 'keep' ? 'keep' : 'fade',
    opacity: THREE.MathUtils.clamp(config.opacity == null ? 0 : config.opacity, 0, 1),
    buildings: config.buildings !== false,
    extras: config.extras !== false,
    terrain: config.terrain === true,
    from: THREE.MathUtils.clamp(config.from == null ? 0.05 : config.from, 0, 0.95),
    to: THREE.MathUtils.clamp(config.to == null ? 0.55 : config.to, 0.05, 1)
  };
}
function contextObjects(activeBuilding, options = {}) {
  const config = surroundingsConfig();
  const objects = [];
  if (config.buildings) {
    buildings.forEach(building => {
      if (building !== activeBuilding) objects.push(building.cityObj);
    });
  }
  if (config.extras) objects.push(...importedObjects, ...propObjects);
  if (config.terrain && terrain) objects.push(terrain);
  if (options.inside !== false) objects.push(...contextPartObjects(activeBuilding));
  return objects;
}
function setContextAlpha(objects, alpha) {
  const value = THREE.MathUtils.clamp(alpha, 0, 1);
  objects.forEach(object => {
    setOpacity(object, value, value < 0.999);
    object.visible = value > 0.003;
  });
}
function clearSurroundings(except = null) {
  const objects = [];
  buildings.forEach(building => {
    objects.push(building.cityObj);
    objects.push(...contextPartObjects(building));
  });
  objects.push(...importedObjects, ...propObjects);
  if (terrain) objects.push(terrain);
  objects.forEach(object => {
    setOpacity(object, 1);
    if (object !== except) object.visible = true;
  });
  if (terrain) terrain.visible = CONFIG.ground.visible !== false;
}
function refreshSurroundings() {
  if (level !== 'building' || !activeBuilding) {
    clearSurroundings();
    return;
  }
  const config = surroundingsConfig();
  clearSurroundings(activeBuilding.cityObj);
  activeBuilding.cityObj.visible = false;
  if (config.mode === 'fade') setContextAlpha(contextObjects(activeBuilding), config.opacity);
}
function resetBuildingFocus(building) {
  if (building && building.detailObj) setOpacity(building.detailObj, 1, false);
}
function applyBuildingFocus(building) {
  if (!building || !building.detailObj) return false;
  resetBuildingFocus(building);
  const focus = building.cfg.detailFocus || {};
  const target = focus.node ? findNodeLoose(building.detailObj, focus.node) : null;
  if (!focus.node) return true;
  if (!target) return false;
  const contextOpacity = THREE.MathUtils.clamp(focus.contextOpacity == null ? 0.04 : focus.contextOpacity, 0, 0.25);
  setOpacity(building.detailObj, contextOpacity, true);
  setOpacity(target, 1, false);
  return true;
}
function solutionGeometry(building, solution) {
  if (!building || !solution || !building.detailObj || CONFIG.naming?.focusGeoOnSolution === false) return null;
  const expected = `GEO_${cleanNodeName(solution.solutionId)}`;
  if (expected === 'GEO_') return null;
  return findNodeLoose(building.detailObj, expected);
}
function applySolutionGeometry(building, solution) {
  const geometry = solutionGeometry(building, solution);
  if (!geometry) {
    applyBuildingFocus(building);
    return;
  }
  const focus = building.cfg.detailFocus || {};
  const contextOpacity = THREE.MathUtils.clamp(focus.contextOpacity == null ? 0.04 : focus.contextOpacity, 0, 0.25);
  resetBuildingFocus(building);
  setOpacity(building.detailObj, contextOpacity, true);
  setOpacity(geometry, 1, false);
  refreshSurroundings();
}
function clearSolutionGeometry(building) {
  if (!building) return;
  applyBuildingFocus(building);
  refreshSurroundings();
}

/* ---- build the city ------------------------------------------------------- */
function buildCity() {
  buildings.forEach(b => scene.remove(b.group));
  buildings = [];
  CONFIG.buildings.forEach((cfg, i) => {
    const group = new THREE.Group();
    group.name = 'building_' + cfg.id;
    // If the named nodes are not in the model, show the whole thing rather
    // than nothing, so a freshly loaded model is visible while it is mapped.
    let srcCity = findNodeLoose(template, cfg.nodes.city);
    let srcDetail = findNodeLoose(template, cfg.nodes.detail);
    if (!srcCity && !srcDetail) { srcCity = template; srcDetail = template; }
    else if (!srcCity) srcCity = srcDetail;
    else if (!srcDetail) srcDetail = srcCity;
    const cityObj = srcCity.clone(true), detailObj = srcDetail.clone(true);
    prepareBranch(cityObj, { forceOpaque: CONFIG.cityShape.forceOpaque });
    prepareBranch(detailObj);
    applyNodeTransformsInTree(cityObj);
    applyNodeTransformsInTree(detailObj);
    detailObj.visible = false;
    group.add(cityObj, detailObj);
    scene.add(group);

    const b = {
      cfg, index: i, group, cityObj, detailObj,
      mixer: new THREE.AnimationMixer(group), action: null,
      markerEl: null, solutionEls: new Map(), baseX: 0
    };
    attachDetachedPins(b, srcDetail);
    applyPlacement(b);
    b.cityBox = worldBox(cityObj);
    b.detailBox = worldBox(detailObj);
    buildings.push(b);
  });
  buildImportedObjects();
  buildProps();
  indexMaterials();
  applyMaterials();
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

/* ---- material registry ---------------------------------------------------
   Every material in the model is indexed by its Blender name so the edit
   panel can change all copies of it at once. The values the model shipped
   with are remembered, so any override can be undone. */
let materialIndex = new Map();
function indexMaterials() {
  materialIndex = new Map();
  const roots = [];
  buildings.forEach(b => roots.push(b.cityObj, b.detailObj));
  importedObjects.forEach(object => roots.push(object));
  propObjects.forEach(object => roots.push(object));
  if (terrain) roots.push(terrain);
  roots.forEach(root => {
    root.traverse(o => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        const n = m.name || '(unnamed)';
        if (!materialIndex.has(n)) materialIndex.set(n, []);
        materialIndex.get(n).push(m);
      });
    });
  });
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
      rememberDisplayMaterial(m);
      applyAnisotropy(m);
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
function applyNodeTransformsInTree(root) {
  if (!root) return;
  root.traverse(object => {
    if (object.name) applyNodeTransform(object, object.name);
  });
  root.updateMatrixWorld(true);
}
function attachDetachedPins(building, sourceDetail) {
  if (!template || !building.detailObj || !sourceDetail) return;
  sourceDetail.updateWorldMatrix(true, false);

  building.cfg.solutions.forEach(solution => {
    if (!solution.node || findNodeLoose(building.detailObj, solution.node)) return;
    const sourcePin = findNodeLoose(template, solution.node);
    if (!sourcePin) return;

    sourcePin.updateWorldMatrix(true, false);
    const world = sourcePin.getWorldPosition(new THREE.Vector3());
    const anchor = new THREE.Object3D();
    anchor.name = solution.node;
    anchor.position.copy(sourceDetail.worldToLocal(world.clone()));
    anchor.visible = false;
    building.detailObj.add(anchor);
  });
  building.detailObj.updateMatrixWorld(true);
}
/* One place that builds the ground, so every path agrees. */
function attachTerrain() {
  if (terrain) { scene.remove(terrain); terrain = null; }
  const name = CONFIG.model.terrainNode;
  const src = (name && template) ? findNodeLoose(template, name) : null;
  if (!src) return;
  terrain = src.clone(true);
  prepareGround(terrain);
  applyNodeTransformsInTree(terrain);
  scene.add(terrain);
  installTerrainTextureFade();
  markDirty(400);
}

function reservedModelRootNames() {
  const names = new Set();
  const add = value => {
    if (!value) return;
    names.add(value);
    names.add(cleanNodeName(value));
  };
  CONFIG.buildings.forEach(building => {
    add(building.nodes && building.nodes.city);
    add(building.nodes && building.nodes.detail);
    building.solutions.forEach(solution => add(solution.node));
  });
  add(CONFIG.model.terrainNode);
  (CONFIG.props || []).forEach(prop => add(prop.node));
  return names;
}
function buildImportedObjects() {
  importedObjects.forEach(object => scene.remove(object));
  importedObjects = [];
  if (!template) return;

  const reserved = reservedModelRootNames();
  template.children.forEach(source => {
    if (!source.name || !hasRenderableNode(source)) return;
    if (reserved.has(source.name) || reserved.has(cleanNodeName(source.name))) return;

    const object = source.clone(true);
    object.userData._sourceNodeName = source.name;
    prepareBranch(object);
    applyNodeTransformsInTree(object);
    scene.add(object);
    importedObjects.push(object);
  });
  markDirty(500);
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
      const src = findNodeLoose(template, cfg.node);
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
  const node = findNodeLoose(b.detailObj, sol.node);
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
  if (v.fit === 'auto' && (buildings.length || importedObjects.length)) {
    const box = new THREE.Box3();
    buildings.forEach(b => box.union(b.cityBox));
    importedObjects.forEach(object => box.union(worldBox(object)));
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
  const to = camStateFor(cityFraming());

  const surroundingObjects = contextObjects(from, { inside: false });
  const surroundingConfig = surroundingsConfig();
  const surroundingStart = from && surroundingConfig.mode === 'fade' ? surroundingConfig.opacity : 1;
  buildings.forEach(building => {
    building.group.position.x = building.baseX;
    building.cityObj.visible = building !== from;
    building.detailObj.visible = building === from;
    if (building !== from) resetBuildingFocus(building);
  });
  if (surroundingStart < 0.999) setContextAlpha(surroundingObjects, surroundingStart);
  else clearSurroundings(from ? from.cityObj : null);

  if (animated && from) {
    const surroundings = surroundingsConfig();
    const context = surroundingStart < 0.999
      ? {
          objects: surroundingObjects,
          fromAlpha: surroundingStart,
          toAlpha: 1,
          from: 1 - surroundings.to,
          to: 1 - surroundings.from
        }
      : null;
    const mode = CONFIG.transitions.fadeMode || 'swap';
    if (mode === 'swap') {
      resetBuildingFocus(from);
      applyBuildingFocus(from);
      setOpacity(from.cityObj, 1);
      startTransition(to, CONFIG.transitions.toCity, {
        swap: {
          from: from.detailObj,
          to: from.cityObj,
          at: 1 - (CONFIG.transitions.swapAt == null ? 0.5 : CONFIG.transitions.swapAt)
        },
        context,
        terrainTextureFade: {
          from: 0,
          to: 1,
          start: 1 - surroundings.to,
          end: 1 - surroundings.from
        },
        onDone: finishCityView
      });
    } else {
      from.cityObj.visible = true;
      resetBuildingFocus(from);
      setOpacity(from.detailObj, 1, true);
      setOpacity(from.cityObj, 0, true);
      startTransition(to, CONFIG.transitions.toCity, {
        fadeOut: from.detailObj,
        fadeIn: from.cityObj,
        context,
        terrainTextureFade: {
          from: 0,
          to: 1,
          start: 1 - surroundings.to,
          end: 1 - surroundings.from
        },
        onDone: finishCityView
      });
    }
  } else {
    buildings.forEach(b => {
      b.cityObj.visible = true;
      b.detailObj.visible = false;
      resetBuildingFocus(b);
      setOpacity(b.cityObj, 1);
    });
    clearSurroundings();
    if (animated) startTransition(to, CONFIG.transitions.toCity, { onDone: finishCityView });
    else {
      applyCamState(to);
      setTerrainTextureVisibility(1);
      finishCityView();
    }
  }
  backBtn.hidden = hazardAreaVisible;
  backBtn.textContent = CONFIG.text.backMap;
  hint.textContent = CONFIG.text.hintCity; hint.style.opacity = '1';
  renderCrumbs(); say('City view. ' + CONFIG.text.hintCity + '.');
}
function finishCityView() {
  setTerrainTextureVisibility(1);
  buildings.forEach(b => {
    b.cityObj.visible = true; b.detailObj.visible = false;
    setOpacity(b.cityObj, 1); setOpacity(b.detailObj, 1);
  });
  clearSurroundings();
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
    o.cityObj.visible = true;
    o.detailObj.visible = false;
    resetBuildingFocus(o);
    setOpacity(o.cityObj, 1);
  });
  clearSurroundings();
  applyBuildingFocus(b);
  const surroundings = surroundingsConfig();
  const surroundingObjects = contextObjects(b);
  const context = surroundings.mode === 'fade' && surroundings.opacity < 0.999 && surroundingObjects.length
    ? {
        objects: surroundingObjects,
        fromAlpha: 1,
        toAlpha: surroundings.opacity,
        from: surroundings.from,
        to: surroundings.to
      }
    : null;
  const to = camStateFor(buildingFraming(b));
  if (animated) {
    if (!warmed) prewarm();
    const mode = CONFIG.transitions.fadeMode || 'swap';
    if (mode === 'swap') {
      startTransition(to, CONFIG.transitions.toBuilding, {
        swap: {
          from: b.cityObj,
          to: b.detailObj,
          at: CONFIG.transitions.swapAt == null ? 0.5 : CONFIG.transitions.swapAt
        },
        context,
        terrainTextureFade: {
          from: 1,
          to: 0,
          start: surroundings.from,
          end: surroundings.to
        },
        onDone: finishEnterBuilding
      });
    } else {
      b.detailObj.visible = true;
      resetBuildingFocus(b);
      setOpacity(b.cityObj, 1, true);
      setOpacity(b.detailObj, 0, true);
      startTransition(to, CONFIG.transitions.toBuilding, {
        fadeOut: b.cityObj,
        fadeIn: b.detailObj,
        context,
        terrainTextureFade: {
          from: 1,
          to: 0,
          start: surroundings.from,
          end: surroundings.to
        },
        onDone: finishEnterBuilding
      });
    }
  }
  else {
    b.cityObj.visible = false;
    b.detailObj.visible = true;
    applyBuildingFocus(b);
    applyCamState(to);
    setTerrainTextureVisibility(0);
    finishEnterBuilding();
  }
  backBtn.hidden = false;
  backBtn.textContent = CONFIG.text.backCity;
  hint.textContent = 'Opening building'; hint.style.opacity = '1';
  renderCrumbs();
}
function finishEnterBuilding() {
  setTerrainTextureVisibility(0);
  buildings.forEach(o => {
    const on = o === activeBuilding;
    o.cityObj.visible = !on;
    o.detailObj.visible = on;
    if (on) applyBuildingFocus(o);
    else resetBuildingFocus(o);
  });
  refreshSurroundings();
  if (activeSolution && activeBuilding) applySolutionGeometry(activeBuilding, activeSolution);
  buildingControls();
  hint.textContent = CONFIG.text.hintBuilding; hint.style.opacity = '1';
  say(activeBuilding.cfg.name + '. ' + CONFIG.text.hintBuilding + '.');
}
function renderCrumbs() {
  const parts = activeBuilding
    ? ['<b>Level 3 · Mitigation Solutions</b>', '<span>›</span><b>' + activeBuilding.cfg.name + '</b>']
    : ['<b>Level 2 · Infrastructure</b>'];
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
const placedSolutionMarkers = [];
function declutterMarkers(items) {
  const config = CONFIG.markers || {};
  if (config.declutter === false || items.length < 2) return;
  const gap = config.minGap == null ? 34 : config.minGap;
  const maxShift = config.maxShift == null ? 30 : config.maxShift;
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const first = items[i], second = items[j];
        let dx = second.x - first.x, dy = second.y - first.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= gap) continue;
        if (distance < 0.001) {
          dx = (j - i) * 0.6;
          dy = 1;
          distance = Math.hypot(dx, dy);
        }
        const push = (gap - distance) / (2 * distance);
        first.x -= dx * push; first.y -= dy * push;
        second.x += dx * push; second.y += dy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  items.forEach(item => {
    const dx = item.x - item.originX, dy = item.y - item.originY;
    const distance = Math.hypot(dx, dy);
    if (distance > maxShift) {
      const scale = maxShift / distance;
      item.x = item.originX + dx * scale;
      item.y = item.originY + dy * scale;
    }
  });
}
function updateMarkers() {
  syncCameraMatrices();
  const blocked = (transition && !transition.keepMarkers) || modal.classList.contains('open');
  placedSolutionMarkers.length = 0;
  buildings.forEach(b => {
    if (b.markerEl) {
      if (level !== 'city' || blocked) b.markerEl.style.display = 'none';
      else placeEl(b.markerEl, markerWorld(b, _v2));
    }
    b.solutionEls.forEach((el, sol) => {
      if (level !== 'building' || b !== activeBuilding || blocked || swayUntil > performance.now()) { el.style.display = 'none'; return; }
      const point = project(solutionWorld(b, sol, _v3));
      if (!point) { el.style.display = 'none'; return; }
      placedSolutionMarkers.push({ el, sol, x: point.x, y: point.y, originX: point.x, originY: point.y });
    });
  });
  declutterMarkers(placedSolutionMarkers);
  placedSolutionMarkers.forEach(item => {
    item.el.style.left = item.x + 'px';
    item.el.style.top = item.y + 'px';
    item.el.style.transform = 'translate(-50%,-50%)';
    item.el.style.display = 'flex';
    item.el.classList.toggle('active', activeSolution === item.sol);
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
  const fr = own.frustum != null ? own.frustum : solutionFrustum(b, sol);
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
function solutionFrustum(building, solution) {
  const config = CONFIG.solutionView;
  if (config.fit === 'manual') return config.frustum;
  const padding = config.padding == null ? 3.2 : config.padding;
  const geometry = solutionGeometry(building, solution) || solutionNode(building, solution);
  if (geometry && hasRenderableNode(geometry)) {
    const size = worldBox(geometry).getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    if (extent > 0.0001) return Math.max(extent * padding, 0.05);
  }
  const buildingSize = building.detailBox.getSize(new THREE.Vector3());
  return Math.max(Math.max(buildingSize.x, buildingSize.y, buildingSize.z) * 0.14, 0.05);
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
  backBtn.textContent = CONFIG.text.backCity;
  previewTitle.textContent = sol.title;
  previewCopy.textContent = sol.description || '';
  const clip = sol.animation && sol.animation.clip ? clips.find(c => c.name === sol.animation.clip) : null;
  const canPlaceholder = CONFIG.animation.placeholder === 'sway';
  playBtn.disabled = !clip && !canPlaceholder;
  playBtn.title = sol.animation && sol.animation.label ? sol.animation.label : 'Play animation';
  playBtn.setAttribute('aria-label', playBtn.title);
  preview.classList.add('visible');
  hint.style.opacity = '0';
  applySolutionGeometry(b, sol);
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
  const building = activeBuilding;
  preview.classList.remove('visible'); activeSolution = null;
  if (level === 'building') {
    backBtn.textContent = CONFIG.text.backCity;
    hint.textContent = CONFIG.text.hintBuilding; hint.style.opacity = '1';
    clearSolutionGeometry(building);
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
const hazardMap = createHazardMap({
  onEnterCity() {
    hazardAreaVisible = false;
    hazardMap.hide();
    if (template) goCity(false);
    backBtn.hidden = false;
  }
});
backBtn.addEventListener('click', () => {
  if (level === 'building') goCity();
  else {
    hazardAreaVisible = true;
    hazardMap.show();
    backBtn.hidden = true;
  }
});
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
    if (transition.terrainTextureFade) {
      const fade = transition.terrainTextureFade;
      const fadeRange = Math.max(0.01, fade.end - fade.start);
      const progress = smooth(THREE.MathUtils.clamp((t - fade.start) / fadeRange, 0, 1));
      setTerrainTextureVisibility(THREE.MathUtils.lerp(fade.from, fade.to, progress));
    }
    if (transition.swap && !transition.swap.done &&
        t >= THREE.MathUtils.clamp(transition.swap.at == null ? 0.5 : transition.swap.at, 0.05, 0.95)) {
      if (transition.swap.from) transition.swap.from.visible = false;
      if (transition.swap.to) transition.swap.to.visible = true;
      transition.swap.done = true;
    }
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
    if (transition.context) {
      const context = transition.context;
      const u = (t - context.from) / Math.max(0.01, context.to - context.from);
      const progress = smooth(THREE.MathUtils.clamp(u, 0, 1));
      setContextAlpha(
        context.objects,
        context.fromAlpha + (context.toAlpha - context.fromAlpha) * progress
      );
    }
    if (t >= 1) {
      if (transition.terrainTextureFade) {
        setTerrainTextureVisibility(transition.terrainTextureFade.to);
      }
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

/* If a base64 GLB is pasted between the quotes below, it is used instead of
   CONFIG.model.url and this HTML file becomes fully self-contained. The
   two file version leaves it empty and loads DPR_CITY.glb from the folder. */
const EMBEDDED_MODEL = ''; // Development uses public/models/DPR_CITY.glb

const modelUrl = EMBEDDED_MODEL
  ? URL.createObjectURL(new Blob([Uint8Array.from(atob(EMBEDDED_MODEL), c => c.charCodeAt(0))], { type: 'model/gltf-binary' }))
  : (new URLSearchParams(location.search).get('model') || CONFIG.model.url);

loadCityModel({
  renderer,
  modelUrl,
  onProgress: xhr => {
    if (xhr.total) loadingBar.style.width = Math.round(xhr.loaded / xhr.total * 100) + '%';
  }
}).then(gltf => {
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
}).catch(err => {
  console.error(err);
  loadingText.innerHTML = 'The model could not be loaded.<br><br>' +
    'Keep <b>' + modelUrl + '</b> in the same folder as this HTML file, and open the page through a web server or an LMS rather than straight from the desktop.';
  loadingBar.parentElement.style.display = 'none';
});
