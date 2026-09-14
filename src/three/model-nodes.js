/**
 * Normalizes Blender/glTF node names for resilient matching.
 * The original name is never changed; this is only used for lookups.
 */
export function cleanNodeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function findNodeLoose(root, name) {
  if (!root || !name) return null;

  const exact = root.getObjectByName(name);
  if (exact) return exact;

  const expected = cleanNodeName(name);
  if (!expected) return null;

  let match = null;
  root.traverse(object => {
    if (!match && object.name && cleanNodeName(object.name) === expected) {
      match = object;
    }
  });
  return match;
}

export function hasRenderableNode(root) {
  let found = false;
  root?.traverse(object => {
    if (object.isMesh || object.isInstancedMesh || object.isLine || object.isPoints) {
      found = true;
    }
  });
  return found;
}
