#!/usr/bin/env node
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { compressTargets, encryptFile } from './backupManager.js';
import { uploadFile } from './uploader.js';

function getEnv(key) {
  const val = process.env[key];
  if (!val || !val.trim()) {
    console.error(`[Backup Fortress] Missing required variable: ${key}`);
    process.exit(1);
  }
  return val.trim();
}

const targets = getEnv('TARGETS').split(',').map((s) => s.trim()).filter(Boolean);
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_KEY');
const bucketName = getEnv('SUPABASE_BUCKET');
const password = getEnv('ENC_PASSWORD');

const timestamp = new Date().toISOString().slice(0, 10);
const tmpDir = path.resolve('tmp_backups');
fs.mkdirSync(tmpDir, { recursive: true });

const archiveName = `backup_${timestamp}.zip`;
const archivePath = path.join(tmpDir, archiveName);
const encryptedName = `${archiveName}.enc`;
const encryptedPath = path.join(tmpDir, encryptedName);
const remotePath = `backups/${encryptedName}`;

function cleanup() {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log(`[Backup Fortress] Starting backup for ${timestamp} ...`);

  try {
    console.log('[1/3] Compressing targets ...');
    await compressTargets(targets, archivePath);

    console.log('[2/3] Encrypting archive (AES-256-GCM) ...');
    await encryptFile(archivePath, encryptedPath, password);

    console.log('[3/3] Uploading to Supabase Storage ...');
    await uploadFile(supabaseUrl, supabaseKey, bucketName, encryptedPath, remotePath);
    console.log(`  Remote path: ${remotePath}`);

    cleanup();
    console.log('[OK] Temporary files cleaned up.');
    console.log('[OK] Backup completed successfully.');
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    cleanup();
    process.exit(1);
  }
}

main();
