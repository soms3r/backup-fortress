import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';

export function compressTargets(targets, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      if (archive.pointer() === 0) {
        return reject(new Error('Archive is empty. No valid targets found.'));
      }
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(`  Warning: ${err.message}`);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    for (const target of targets) {
      const absPath = path.resolve(target);
      if (!fs.existsSync(absPath)) {
        console.warn(`  Warning: target not found, skipping — ${target}`);
        continue;
      }
      const stats = fs.statSync(absPath);
      if (stats.isDirectory()) {
        archive.directory(absPath, path.basename(absPath));
      } else {
        archive.file(absPath, { name: path.basename(absPath) });
      }
    }

    archive.finalize();
  });
}

export function encryptFile(inputPath, outputPath, password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    output.write(salt);
    output.write(iv);

    input
      .pipe(cipher)
      .pipe(output, { end: false });

    cipher.on('end', () => {
      const authTag = cipher.getAuthTag();
      output.write(authTag);
      output.end();
    });

    output.on('finish', resolve);

    input.on('error', reject);
    cipher.on('error', reject);
    output.on('error', reject);
  });
}

export function decryptFile(inputPath, outputPath, password) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    let salt, iv, authTag;
    let headerRead = false;
    let chunks = [];
    let bytesRead = 0;
    const HEADER_SIZE = 32 + 12; // salt + iv

    input.on('readable', function () {
      if (!headerRead) {
        const header = this.read(HEADER_SIZE);
        if (header) {
          salt = header.subarray(0, 32);
          iv = header.subarray(32, 44);
          headerRead = true;
        } else {
          return reject(new Error('File too small — corrupt or invalid.'));
        }
      }

      let chunk;
      while ((chunk = this.read()) !== null) {
        chunks.push(chunk);
        bytesRead += chunk.length;
      }
    });

    input.on('end', () => {
      if (!salt || !iv || chunks.length === 0) {
        return reject(new Error('Invalid encrypted file.'));
      }

      const combined = Buffer.concat(chunks);
      authTag = combined.subarray(combined.length - 16);
      const ciphertext = combined.subarray(0, combined.length - 16);

      const key = crypto.scryptSync(password, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      try {
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        output.write(decrypted);
        output.end();
        output.on('finish', resolve);
      } catch (err) {
        reject(new Error('Decryption failed. Wrong password or corrupted file.'));
      }
    });

    input.on('error', reject);
    output.on('error', reject);
  });
}
