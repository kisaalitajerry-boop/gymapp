import { createJsonStorage } from './json.js';
import { createPostgresStorage } from './postgres.js';

export function createStorage(type = process.env.STORAGE || 'json', options = {}) {
  const t = String(type).toLowerCase();
  if (t === 'json') {
    return createJsonStorage(options);
  }
  if (t === 'postgres') {
    return createPostgresStorage(options);
  }
  throw new Error(`Unsupported storage type: ${type}`);
}

let defaultStorageInstance = null;
export function getStorage(options = {}) {
  if (!defaultStorageInstance || Object.keys(options).length > 0) {
    const inst = createStorage(process.env.STORAGE || 'json', options);
    if (!defaultStorageInstance) defaultStorageInstance = inst;
    return inst;
  }
  return defaultStorageInstance;
}

export default getStorage();
