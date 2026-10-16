#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildBundle } from './lib.mjs';

const args = process.argv.slice(2);
const manifestPath = args[0];
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : null;

if (!manifestPath) {
  console.error('Usage: node imports/import.mjs <manifest.json> [--out <bundle.json>]');
  process.exit(2);
}

try {
  const bundle = buildBundle(resolve(manifestPath));
  delete bundle.input_path_resolved;
  const text = `${JSON.stringify(bundle, null, 2)}\n`;
  if (outPath) {
    const target = resolve(outPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
    console.log(`Wrote ${bundle.summary.total} records to ${target}`);
  } else {
    process.stdout.write(text);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
