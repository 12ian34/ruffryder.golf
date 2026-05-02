import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const envText = readFileSync('.env', 'utf8');
const supabaseUrl = readEnvValue(envText, 'VITE_SUPABASE_URL');

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const result = spawnSync(
  'npx',
  ['--yes', 'supabase@latest', 'gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public'],
  {
    encoding: 'utf8',
    env: process.env,
  }
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

writeFileSync('src/types/supabase.ts', result.stdout);
console.log('Generated src/types/supabase.ts from Supabase project schema without Docker.');

function readEnvValue(envText, key) {
  const pattern = new RegExp(`^${key}=(.+)$`, 'm');
  const match = envText.match(pattern);

  if (!match) {
    return null;
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}
