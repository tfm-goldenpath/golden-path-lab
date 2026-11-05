import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function environmentProbe() {
  return { check: 'environment-smoke', ok: true, node: process.version, platform: process.platform, arch: process.arch };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(environmentProbe()));
}
