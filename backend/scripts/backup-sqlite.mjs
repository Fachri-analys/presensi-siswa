import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const source = path.resolve(process.env.SQLITE_DATABASE_PATH ?? '/app/data/presensi.db');
const destination = process.argv[2];
const dataDirectory = path.resolve(process.env.SQLITE_DATA_DIR ?? '/app/data');

if (!destination || path.dirname(path.resolve(destination)) !== dataDirectory) {
  throw new Error(`Path backup harus berada langsung di ${dataDirectory}.`);
}
if (path.resolve(destination) === source || fs.existsSync(destination)) {
  throw new Error('Path backup sama dengan database sumber atau sudah ada.');
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const database = new DatabaseSync(source, { readOnly: true });

try {
  const [check] = database.prepare('PRAGMA integrity_check').all();
  if (check.integrity_check !== 'ok') {
    throw new Error(`Pemeriksaan integritas SQLite gagal: ${check.integrity_check}`);
  }
  database.exec(`VACUUM INTO ${quote(destination)}`);
} finally {
  database.close();
}

const backup = new DatabaseSync(destination, { readOnly: true });
try {
  const [check] = backup.prepare('PRAGMA integrity_check').all();
  if (check.integrity_check !== 'ok') {
    throw new Error(`Pemeriksaan integritas backup gagal: ${check.integrity_check}`);
  }
} finally {
  backup.close();
}

fs.chmodSync(destination, 0o600);
console.log(`Backup SQLite valid (${fs.statSync(destination).size} bytes).`);
