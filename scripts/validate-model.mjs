import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_MODEL = 'public/models/DPR_CITY.glb';
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const HEADER_LENGTH = 12;
const CHUNK_HEADER_LENGTH = 8;

function normalizeName(name) {
  return name
    .replace(/^[ \t]+|[ \t]+$/g, '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hasOuterWhitespace(name) {
  return /^[ \t]/.test(name) || /[ \t]$/.test(name);
}

function readGlb(filePath) {
  let data;
  try {
    data = readFileSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`File is not readable: ${filePath}`);
    }
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }

  if (data.length < HEADER_LENGTH) {
    throw new Error('Invalid GLB: file is shorter than the header');
  }

  const magic = data.readUInt32LE(0);
  const version = data.readUInt32LE(4);
  const declaredLength = data.readUInt32LE(8);

  if (magic !== GLB_MAGIC) {
    throw new Error('Invalid GLB: magic must be "glTF"');
  }
  if (version !== 2) {
    throw new Error(`Invalid GLB: unsupported version ${version}; expected 2`);
  }
  if (declaredLength !== data.length) {
    throw new Error(
      `Invalid GLB: declared length ${declaredLength} does not match file length ${data.length}`,
    );
  }

  let offset = HEADER_LENGTH;
  let json = null;
  while (offset < data.length) {
    if (offset + CHUNK_HEADER_LENGTH > data.length) {
      throw new Error('Invalid GLB: incomplete chunk header');
    }

    const chunkLength = data.readUInt32LE(offset);
    const chunkType = data.readUInt32LE(offset + 4);
    const chunkStart = offset + CHUNK_HEADER_LENGTH;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > data.length) {
      throw new Error('Invalid GLB: chunk extends beyond the file');
    }

    if (chunkType === JSON_CHUNK_TYPE) {
      if (json !== null) {
        throw new Error('Invalid GLB: multiple JSON chunks found');
      }
      const jsonText = data.subarray(chunkStart, chunkEnd).toString('utf8').replace(/\0+$/, '').trim();
      try {
        json = JSON.parse(jsonText);
      } catch {
        throw new Error('Invalid GLB: JSON chunk is not valid JSON');
      }
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('Invalid GLB: JSON chunk must contain an object');
      }
    }

    offset = chunkEnd;
  }

  if (json === null) {
    throw new Error('Invalid GLB: JSON chunk not found');
  }

  return json;
}

function validateSceneData(json, errors) {
  if (!Array.isArray(json.nodes) || json.nodes.length === 0) {
    errors.push('GLB JSON must contain a non-empty nodes array');
  }
  if (!Array.isArray(json.scenes) || json.scenes.length === 0) {
    errors.push('GLB JSON must contain a non-empty scenes array');
    return;
  }

  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const usableScene = json.scenes.some(
    (scene) =>
      scene &&
      Array.isArray(scene.nodes) &&
      scene.nodes.length > 0 &&
      scene.nodes.every((index) => Number.isInteger(index) && index >= 0 && index < nodes.length),
  );
  if (!usableScene) {
    errors.push('GLB JSON must contain at least one usable scene with valid node references');
  }
}

function getNodeRecords(json, warnings) {
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const records = [];
  const normalizedNames = new Map();

  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object' || typeof node.name !== 'string') {
      return;
    }

    const originalName = node.name;
    const normalizedName = normalizeName(originalName);
    records.push({ index, node, originalName, normalizedName });

    if (hasOuterWhitespace(originalName)) {
      warnings.push(`Node contains leading/trailing whitespace: ${JSON.stringify(originalName)}`);
    }
    if (/\.\d{3}$/.test(originalName)) {
      warnings.push(`Node contains an automatic Blender suffix: ${JSON.stringify(originalName)}`);
    }

    const duplicate = normalizedNames.get(normalizedName);
    if (normalizedNames.has(normalizedName)) {
      warnings.push(
        `Duplicate normalized node name: ${JSON.stringify(originalName)} matches ${JSON.stringify(duplicate)}`,
      );
    } else {
      normalizedNames.set(normalizedName, originalName);
    }
  });

  return records;
}

function collectConventions(records, errors, warnings) {
  const terrain = records.find(({ normalizedName }) => normalizedName === 'TERRAIN_MAIN');
  if (!terrain) {
    errors.push('TERRAIN_MAIN not found');
  }

  const heroes = new Map();
  const pins = [];
  const geos = new Map();

  for (const record of records) {
    const { normalizedName } = record;
    let match = normalizedName.match(/^HERO_(HP|LP)_(.+)_ROOT$/);
    if (match) {
      const [, quality, assetId] = match;
      const entry = heroes.get(assetId) ?? {};
      entry[quality] = record;
      heroes.set(assetId, entry);
      continue;
    }

    match = normalizedName.match(/^PIN_(.+)_(\d{2})$/);
    if (match) {
      pins.push({ ...record, solutionId: match[1], number: match[2] });
      continue;
    }

    match = normalizedName.match(/^GEO_(.+)$/);
    if (match) {
      if (/\.\d+$/.test(record.originalName.trim())) {
        continue;
      }
      geos.set(match[1], record);
    }
  }

  for (const [assetId, pair] of heroes) {
    if (!pair.HP || !pair.LP) {
      errors.push(`HERO pair incomplete: ${assetId}`);
    } else {
      console.log(`✓ HERO pair found: ${assetId}`);
    }
  }

  for (const pin of pins) {
    const geo = geos.get(pin.solutionId);
    if (!geo) {
      errors.push(`${pin.normalizedName} requires GEO_${pin.solutionId}`);
    } else {
      console.log(`✓ ${pin.normalizedName} → ${geo.normalizedName}`);
    }
  }

  for (const [solutionId] of geos) {
    if (!pins.some((pin) => pin.solutionId === solutionId)) {
      warnings.push(`GEO_${solutionId} has no associated PIN`);
    }
  }

  return { heroes, pins, geos };
}

function accessorTriangleCount(json, nodes, nodeIndex, visited = new Set()) {
  if (visited.has(nodeIndex)) {
    return 0;
  }
  visited.add(nodeIndex);

  const node = nodes[nodeIndex];
  if (!node || typeof node !== 'object') {
    return 0;
  }

  const mesh =
    Array.isArray(json.meshes) && Number.isInteger(node.mesh)
      ? json.meshes[node.mesh]
      : null;
  let triangles = 0;

  if (mesh && Array.isArray(mesh.primitives)) {
    for (const primitive of mesh.primitives) {
      if (!primitive || typeof primitive !== 'object') {
        continue;
      }

      const attributes = primitive.attributes;
      const positionAccessor =
        attributes && Number.isInteger(attributes.POSITION)
          ? json.accessors?.[attributes.POSITION]
          : null;
      const indexAccessor = Number.isInteger(primitive.indices)
        ? json.accessors?.[primitive.indices]
        : null;
      const count = indexAccessor?.count ?? positionAccessor?.count;

      if (Number.isFinite(count)) {
        triangles += Math.floor(count / 3);
      }
    }
  }

  if (Array.isArray(node.children)) {
    for (const childIndex of node.children) {
      if (Number.isInteger(childIndex)) {
        triangles += accessorTriangleCount(json, nodes, childIndex, visited);
      }
    }
  }

  return triangles;
}

function warnAboutGeometry(json, heroes, warnings) {
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  for (const [assetId, pair] of heroes) {
    if (!pair.HP || !pair.LP) {
      continue;
    }
    const hpTriangles = accessorTriangleCount(json, nodes, pair.HP.index);
    const lpTriangles = accessorTriangleCount(json, nodes, pair.LP.index);
    if (hpTriangles < lpTriangles * 0.5) {
      warnings.push(
        `HP and LP geometry may be inverted for ${assetId} (HP: ${hpTriangles}, LP: ${lpTriangles} triangles)`,
      );
    }
  }
}

function validateModel(filePath) {
  const errors = [];
  const warnings = [];
  const json = readGlb(filePath);

  validateSceneData(json, errors);
  const records = getNodeRecords(json, warnings);
  const conventions = collectConventions(records, errors, warnings);
  warnAboutGeometry(json, conventions.heroes, warnings);

  console.log('✓ Valid GLB 2.0');
  if (records.some(({ normalizedName }) => normalizedName === 'TERRAIN_MAIN')) {
    console.log('✓ TERRAIN_MAIN found');
  }
  for (const warning of warnings) {
    console.log(`⚠ ${warning}`);
  }

  console.log('\nModel summary:');
  console.log(`- Nodes: ${Array.isArray(json.nodes) ? json.nodes.length : 0}`);
  console.log(`- Assets: ${conventions.heroes.size}`);
  console.log(`- Pins: ${conventions.pins.length}`);
  console.log(`- Geometry groups: ${conventions.geos.size}`);
  console.log(`- Errors: ${errors.length}`);
  console.log(`- Warnings: ${warnings.length}`);

  for (const error of errors) {
    console.error(`✗ ${error}`);
  }
  return errors.length === 0;
}

const modelPath = process.argv[2] || DEFAULT_MODEL;
console.log(`Validating ${modelPath}\n`);

try {
  if (!validateModel(resolve(modelPath))) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
}
