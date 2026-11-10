#!/usr/bin/env node
// Tuyamika MVP bootstrap server entry point.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Crash guards: capture fatal failures into the error ledger before exit.
const guards = await import('../src/server/crash-guards.mjs');
process.on('uncaughtException', guards.logCrash);
process.on('unhandledRejection', guards.logCrash);

export { __dirname };

await import('../src/server/index.mjs');
