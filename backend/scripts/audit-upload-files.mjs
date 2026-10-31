#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs/promises';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL wajib diatur.');

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'));
const prisma = new PrismaClient();

try {
  const [letters, entries] = await Promise.all([
    prisma.sickLetter.findMany({ select: { fileName: true } }),
    fs.readdir(uploadDir, { withFileTypes: true }),
  ]);
  const referenced = new Set(letters.map((letter) => letter.fileName));
  const present = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
  const orphaned = [...present].filter((name) => !referenced.has(name));
  const missing = [...referenced].filter((name) => !present.has(name));

  console.log(`Direktori upload: ${uploadDir}`);
  console.log(`Lampiran tercatat: ${referenced.size}; file: ${present.size}; yatim: ${orphaned.length}; hilang: ${missing.length}`);
  for (const name of orphaned) console.log(`YATIM ${name}`);
  for (const name of missing) console.log(`HILANG ${name}`);
  if (orphaned.length || missing.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
