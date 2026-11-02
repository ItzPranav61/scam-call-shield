import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const scenarioFile = z.strictObject({
  segments: z.array(z.string().min(1).max(8000)).min(1).max(32),
  expectedFinalLevel: z.enum(['safe', 'caution', 'danger']),
  expectedWarningCode: z.string().nullable(),
});

/** Works from source and compiled output without depending on the caller's cwd. */
function scenarioDirectory(): string {
  let directory = fileURLToPath(new URL('.', import.meta.url));
  while (true) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null && 'workspaces' in parsed
          && Array.isArray(parsed.workspaces)) return join(directory, 'data', 'scenarios');
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Scenario workspace not found');
    directory = parent;
  }
}

/** Only paths from trusted directory entries are read, never paths from a message. */
export function loadScenarios(): ReadonlyMap<string, readonly string[]> {
  const directory = scenarioDirectory();
  const catalog = new Map<string, readonly string[]>();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u.test(entry.name)) continue;
    const scenario = scenarioFile.parse(JSON.parse(readFileSync(join(directory, entry.name), 'utf8')));
    catalog.set(entry.name.slice(0, -5), Object.freeze([...scenario.segments]));
  }
  return catalog;
}
