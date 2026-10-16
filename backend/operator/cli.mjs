#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  DATABASE_NAME,
  buildAcceptedExportSql,
  buildModerationSql,
  buildPendingSql,
  buildStatsSql,
  extractRows,
  makeAcceptedExport,
  normalizeCutoff,
  normalizeLimit
} from './lib.mjs';

const args = process.argv.slice(2);
const command = args[0];
const options = parseOptions(args.slice(1));
const mode = options.remote ? '--remote' : '--local';

try {
  switch (command) {
    case 'list':
      printRows(runQuery(buildPendingSql(normalizeLimit(options.limit)), mode));
      break;
    case 'stats':
      printRows(runQuery(buildStatsSql(), mode));
      break;
    case 'accept':
      mutate(buildModerationSql({ id: options._[0], action: 'accept' }), mode);
      break;
    case 'reject':
      mutate(buildModerationSql({ id: options._[0], action: 'reject', reason: options.reason }), mode);
      break;
    case 'export-accepted':
      exportAccepted(options, mode);
      break;
    case 'backup':
      backupDatabase(options, mode);
      break;
    default:
      printHelp();
      process.exitCode = command ? 2 : 0;
  }
} catch (error) {
  console.error(`operator error: ${error.message}`);
  process.exitCode = 1;
}

function parseOptions(tokens) {
  const parsed = { _: [], remote: false };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--remote') {
      parsed.remote = true;
      continue;
    }
    if (!token.startsWith('--')) {
      parsed._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (!next || next.startsWith('--')) throw new Error(`${token} requires a value`);
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function runQuery(sql, mode) {
  const output = runWrangler([
    'd1', 'execute', DATABASE_NAME,
    mode,
    '--command', sql,
    '--json'
  ]);
  return extractRows(JSON.parse(output));
}

function mutate(sql, mode) {
  const output = runWrangler([
    'd1', 'execute', DATABASE_NAME,
    mode,
    '--command', sql,
    '--json'
  ]);
  const payload = JSON.parse(output);
  console.log(JSON.stringify(payload, null, 2));
}

function exportAccepted(options, mode) {
  const cutoff = normalizeCutoff(options.cutoff);
  const outputPath = requiredOutputPath(options.out);
  const rows = runQuery(buildAcceptedExportSql(cutoff), mode);
  const payload = makeAcceptedExport(rows, { cutoff });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`wrote ${payload.report_count} accepted report(s) to ${outputPath}`);
}

function backupDatabase(options, mode) {
  const outputPath = requiredOutputPath(options.out);
  mkdirSync(dirname(outputPath), { recursive: true });
  runWrangler([
    'd1', 'export', DATABASE_NAME,
    mode,
    '--output', outputPath,
    '--yes'
  ], { inherit: true });
}

function requiredOutputPath(value) {
  if (!value) throw new Error('--out is required');
  return resolve(value);
}

function runWrangler(wranglerArgs, { inherit = false } = {}) {
  return execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['wrangler', ...wranglerArgs],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'inherit']
    }
  ) ?? '';
}

function printRows(rows) {
  if (rows.length === 0) {
    console.log('no rows');
    return;
  }
  console.table(rows);
}

function printHelp() {
  console.log(`Open Worktime operator CLI

Default target is local D1. Add --remote explicitly to touch production.

Commands:
  node operator/cli.mjs list [--limit 50] [--remote]
  node operator/cli.mjs stats [--remote]
  node operator/cli.mjs accept <rpt_uuid> [--remote]
  node operator/cli.mjs reject <rpt_uuid> --reason <code> [--remote]
  node operator/cli.mjs export-accepted --cutoff <ISO time> --out <file.json> [--remote]
  node operator/cli.mjs backup --out <private-backup.sql> [--remote]

Reject reasons:
  spam | duplicate | malformed | privacy_risk | test_submission | other

Do not reject a report merely because it is sales, management, high-income,
or outside a manufacturing region. Those are release-time relevance questions.`);
}
