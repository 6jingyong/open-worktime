#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildIlostatBundleFromCsv } from './ilostat.mjs';
import { buildWorkingTimeBundleFromCsv } from './workingtime.mjs';

const [source, input, ...rest] = process.argv.slice(2);
if (!source || !input || !['ilostat', 'workingtime'].includes(source)) {
  usage();
  process.exit(2);
}

const outIndex = rest.indexOf('--out');
const out = outIndex >= 0 ? rest[outIndex + 1] : null;
if (outIndex >= 0 && !out) {
  console.error('--out requires a path');
  process.exit(2);
}

const inputPath = resolve(input);
const generatedAt = new Date().toISOString();
const bundle = source === 'ilostat'
  ? buildIlostatBundleFromCsv(inputPath, generatedAt)
  : buildWorkingTimeBundleFromCsv(inputPath, generatedAt);

if (source === 'workingtime') {
  console.error('WorkingTime source is marked internal_only: do not publish normalized source records without permission.');
}

const payload = `${JSON.stringify(bundle, null, 2)}\n`;
if (out) {
  const outputPath = resolve(out);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, payload);
  console.error(`wrote ${bundle.records.length} records to ${outputPath}`);
} else {
  process.stdout.write(payload);
}

function usage() {
  console.error('Usage: node imports/adapters/import-source.mjs <ilostat|workingtime> <source.csv> [--out output.json]');
}
