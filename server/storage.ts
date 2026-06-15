import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PredictionRecord } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadRecords(): PredictionRecord[] {
  ensureDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as PredictionRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(record: PredictionRecord): PredictionRecord[] {
  ensureDir();
  const records = loadRecords();
  records.push(record);
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
  return records;
}
