#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, openSync, closeSync, appendFileSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT ?? 8000);
const base = `http://127.0.0.1:${port}`;
const logDirectory = new URL('../output/local-preview/', import.meta.url);
const logFile = new URL('server.log', logDirectory);
const expectedVersion = JSON.parse(readFileSync(new URL('../data/survey-manifest.json', import.meta.url))).version;

async function isOurPreview() {
  try {
    const response = await fetch(`${base}/data/survey-manifest.json`, { signal: AbortSignal.timeout(1200) });
    return response.ok && (await response.json()).version === expectedVersion;
  } catch { return false; }
}

function isPortOpen() {
  return new Promise(resolve => {
    const socket = createConnection({ host:'127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(1000);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

async function start() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  if (await isOurPreview()) {
    console.log(`Open Worktime is already running: ${base}/cities.html?v=compact-v3`);
    return;
  }
  if (await isPortOpen()) throw new Error(`Port ${port} is occupied by another service. No process was stopped. Set PORT to a free port.`);
  mkdirSync(logDirectory, { recursive:true });
  appendFileSync(logFile, `\n[${new Date().toISOString()}] Starting local preview\n`);
  const log = openSync(logFile, 'a');
  let child;
  try {
    child = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], {
      cwd:root, detached:true, windowsHide:true,
      env:{ ...process.env, PORT:String(port) }, stdio:['ignore', log, log]
    });
    await once(child, 'spawn');
    child.unref();
  } finally { closeSync(log); }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(200);
    if (await isOurPreview()) {
      console.log(`Open Worktime started in the background (PID ${child.pid}).`);
      console.log(`${base}/cities.html?v=compact-v3`);
      console.log(`Log: ${fileURLToPath(logFile)}`);
      return;
    }
  }
  throw new Error(`Preview did not become ready. Check ${fileURLToPath(logFile)}.`);
}

start().catch(error => { console.error(error.message); process.exitCode = 1; });
