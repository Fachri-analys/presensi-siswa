import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const [sourceArg, restoredArg] = process.argv.slice(2);
if (!sourceArg || !restoredArg) {
  throw new Error('Gunakan: node verify-sqlite-restore.mjs <database-asal> <database-pulih>');
}

const sourcePath = path.resolve(sourceArg);
const restoredPath = path.resolve(restoredArg);
if (sourcePath === restoredPath) {
  throw new Error('Database asal dan hasil pemulihan harus berbeda.');
}

function inspectDatabase(filePath) {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const [integrity] = db.prepare('PRAGMA integrity_check').all();
    if (integrity?.integrity_check !== 'ok') {
      throw new Error(`Pemeriksaan integritas gagal: ${filePath}`);
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length > 0) {
      throw new Error(`Pemeriksaan foreign key gagal: ${filePath}`);
    }

    const tables = db.prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).all().map(({ name }) => name);
    const counts = Object.fromEntries(tables.map((name) => {
      const quotedName = `"${name.replaceAll('"', '""')}"`;
      const [result] = db.prepare(`SELECT COUNT(*) AS count FROM ${quotedName}`).all();
      return [name, Number(result.count)];
    }));
    return counts;
  } finally {
    db.close();
  }
}

const sourceCounts = inspectDatabase(sourcePath);
const restoredCounts = inspectDatabase(restoredPath);
if (JSON.stringify(sourceCounts) !== JSON.stringify(restoredCounts)) {
  throw new Error('Jumlah baris per tabel berbeda antara database asal dan hasil pemulihan.');
}

console.log(`Database hasil pemulihan valid; integritas, foreign key, dan ${Object.keys(sourceCounts).length} jumlah tabel cocok.`);
