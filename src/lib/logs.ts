/**
 * Logging utilities for CheckMate CLI
 * Handles logging spec run results and resetting specs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseSpec } from './specs.js';

// Forward exports from executor.ts to avoid circular dependencies
export { logRun, resetSpec } from './executor.js'; 