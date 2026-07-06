import { promises as fs, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const isVercel = !!process.env.VERCEL;

export const DATA_DIR = (() => {
  if (process.env.EMAILBUILDER_DATA_DIR) {
    return process.env.EMAILBUILDER_DATA_DIR;
  }
  if (isVercel) {
    return '/tmp/emailbuilder-data';
  }
  // Local dev: prefer the moved folder `app/data`, fallback to sister `../data` if it exists
  const localAppPath = path.resolve(process.cwd(), 'data');
  const localSisterPath = path.resolve(process.cwd(), '..', 'data');
  if (existsSync(localAppPath)) {
    return localAppPath;
  }
  if (existsSync(localSisterPath)) {
    return localSisterPath;
  }
  return localAppPath;
})();

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');

let initialized = false;

function copyDirSync(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function ensureInitialized() {
  if (!isVercel || initialized) return;
  initialized = true;
  try {
    const exists = existsSync(DATA_DIR);
    if (!exists) {
      mkdirSync(DATA_DIR, { recursive: true });
      if (existsSync(BUNDLED_DATA_DIR)) {
        copyDirSync(BUNDLED_DATA_DIR, DATA_DIR);
      }
    }
  } catch (err) {
    console.error('Failed to initialize ephemeral storage:', err);
  }
}

export function dataPath(relPath: string): string {
  ensureInitialized();
  return path.join(DATA_DIR, relPath);
}

export async function fileExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(dataPath(relPath));
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(dataPath(relPath), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Escritura atómica: .tmp + rename evita archivos corruptos por escrituras parciales
export async function writeJson<T>(relPath: string, data: T): Promise<void> {
  const target = dataPath(relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, target);
}

// Serializa operaciones read-modify-write sobre el mismo archivo
const locks = new Map<string, Promise<unknown>>();

export function withFileLock<T>(relPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(relPath) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  locks.set(relPath, next);
  return next;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}
