import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

export async function uploadFile(supabaseUrl, supabaseKey, bucketName, filePath, destinationPath) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fileBuffer = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);

  console.log(`  File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(destinationPath, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return data;
}
