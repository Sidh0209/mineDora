/**
 * Simple file-based JSON database for MineDora.
 * Stores data in `data/` at the project root. No external DB required.
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readDb<T>(name: string, fallback: T): T {
  ensureDir();
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeDb<T>(name: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
}
