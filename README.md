# 🔐 Backup Fortress

> **Lightweight, production-ready, local-first automated backup utility.**  
> Compress → Encrypt (AES-256-GCM) → Upload to Supabase Storage — zero cost, maximum security.

---

## Features

- **Zero-cost hosting** — leverages Supabase Storage free tier (1 GB included).
- **Military-grade encryption** — AES-256-GCM via Node.js built-in `crypto` module. Encrypted before upload; Supabase never sees plaintext data.
- **Local-first** — archives and encrypts on your machine. No third-party processing.
- **Minimal dependencies** — only `dotenv`, `archiver`, and `@supabase/supabase-js`.
- **Idempotent uploads** — uses `upsert` so repeated runs won't create duplicates.
- **Auto-cleanup** — temporary files are deleted immediately after a successful upload.
- **Automation-ready** — designed to be scheduled via Cron (Linux/macOS) or Task Scheduler (Windows).

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Supabase](https://supabase.com/) project (free tier works perfectly)
- A Supabase Storage bucket (create one in the Dashboard → Storage)

---

## Installation

```bash
# Clone or create the project directory
mkdir backup-fortress && cd backup-fortress

# Clone the repo or copy the files into it, then:
npm install
```

### Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable          | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `TARGETS`         | Comma-separated paths to files/directories to back up             |
| `SUPABASE_URL`    | Your Supabase project URL (Settings → API → Project URL)          |
| `SUPABASE_KEY`    | Your Supabase **service_role** key (Settings → API → `service_role` key) |
| `SUPABASE_BUCKET` | The name of your Supabase Storage bucket                          |
| `ENC_PASSWORD`    | A strong passphrase for AES-256-GCM encryption (32+ chars)        |

> **Security:** The service_role key has admin access to your Supabase project. Keep your `.env` file out of version control — it is listed in `.gitignore` by default.

---

## Usage

Run manually:

```bash
npm start
# or
node index.js
# or
npx backup-fortress
```

On success you'll see:

```
[Backup Fortress] Starting backup for 2026-05-23 ...
[1/3] Compressing targets ...
[2/3] Encrypting archive (AES-256-GCM) ...
[3/3] Uploading to Supabase Storage ...
  File size: 4.23 MB
  Remote path: backups/backup_2026-05-23.zip.enc
[OK] Temporary files cleaned up.
[OK] Backup completed successfully.
```

---

## Automation

### Linux / macOS — Cron

```bash
crontab -e
```

Add a line to run daily at 3 AM:

```
0 3 * * * cd /path/to/backup-fortress && /usr/bin/node index.js >> ./backup.log 2>&1
```

### Windows — Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**.
2. **Trigger:** Daily, at your preferred time.
3. **Action:** Start a program.
   - **Program:** `C:\Program Files\nodejs\node.exe`
   - **Arguments:** `D:\backup-fortress\index.js`
   - **Start in:** `D:\backup-fortress`
4. Finish and enable the task.

> Ensure the user account running the task has read access to the target paths and write access to the project directory.

---

## How to Restore

Backup Fortress does not include a built-in restore command (the script is designed for backup-only automation). To restore a backup, use the included `decryptFile` utility or run this one-liner:

### Restore Script

Create a file `restore.js` in the project directory:

```js
import 'dotenv/config';
import { decryptFile } from './backupManager.js';

const password = process.env.ENC_PASSWORD;
const encryptedFile = './backup_2026-05-23.zip.enc';
const outputFile = './restored_backup.zip';

decryptFile(encryptedFile, outputFile, password)
  .then(() => console.log('Restored:', outputFile))
  .catch((err) => console.error('Restore failed:', err.message));
```

Run it:

```bash
node restore.js
```

Then unzip `restored_backup.zip` normally.

### Manual Decryption (Alternative)

If you prefer to decrypt without Node.js, you can use OpenSSL:

```bash
# Extract salt (first 32 bytes), iv (next 12 bytes), auth tag (last 16 bytes)
# and decrypt with AES-256-GCM.
# This requires some byte-slicing — Node.js method above is much simpler.
```

---

## File Structure

```
backup-fortress/
├── index.js            # Entry point — orchestrates the backup workflow
├── backupManager.js    # Compression (archiver) & encryption (crypto) logic
├── uploader.js         # Supabase Storage upload client
├── .env                # Your configuration (git-ignored)
├── .env.example        # Template for configuration
├── package.json
└── README.md
```

---

## Security Model

| Concern              | How It's Addressed                                                        |
| -------------------- | ------------------------------------------------------------------------- |
| **Encryption**       | AES-256-GCM with a unique 32-byte salt and 12-byte IV per backup          |
| **Key Derivation**   | `crypto.scryptSync` — memory-hard KDF, resistant to GPU/ASIC attacks      |
| **Integrity**        | GCM authentication tag verifies ciphertext has not been tampered with      |
| **Transit**          | Uploaded over HTTPS to Supabase                                           |
| **At Rest**          | Encrypted before leaving your machine; Supabase stores only ciphertext     |
| **Secrets**          | All keys live in `.env`, never in code or version control                 |

---

## Limits

- **Supabase Free Tier:** 1 GB storage, 2 GB bandwidth, 100 MB max file upload.
- For larger backups, consider upgrading to Supabase Pro or splitting targets.
- Encryption overhead adds ~60 bytes per file (salt + IV + auth tag).

---

## FAQ

**Q: Can I back up to multiple buckets?**  
Run multiple instances of the script with different `.env` files.

**Q: What if the upload fails mid-way?**  
Partial temporary files are cleaned up on failure. The remote bucket retains the previous version (due to `upsert`, only a successful upload overwrites it).

**Q: Can I use this with other S3-compatible storage?**  
Not directly — this uses the Supabase JS client. Fork `uploader.js` to swap in `@aws-sdk/client-s3` if needed.

---

## 🛠️ Credits & Attribution

- **Tool Creator:** Somser Ali ([@soms3r](https://github.com/soms3r))
- **Special Thanks:** Tasneem Bin Ahsan ([@TBAhsan](https://github.com/TBAhsan))
- **Sponsor:** [tlogz.com](https://tlogz.com)

---

<div align="center">
  <sub>Built with ❤️ for the open-source community.</sub>
</div>
