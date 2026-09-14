import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const JSM = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/';

/* Blender's exporter can compress meshes, and textures can be KTX2. Each of
   those needs its own decoder, otherwise GLTFLoader simply refuses the file.
   They are attached lazily, so a plain model downloads none of them. */
let decoderCache = null;
async function attachDecoders(target, renderer) {
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

export async function loadCityModel({ renderer, modelUrl, onProgress }) {
  const loader = new GLTFLoader();
  return attachDecoders(loader, renderer).catch(() => { }).then(() => {
    return new Promise((resolve, reject) => {
      loader.load(modelUrl, gltf => resolve(gltf), onProgress, err => reject(err));
    });
  });
}
