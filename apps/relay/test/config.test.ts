import { describe, expect, it, vi } from 'vitest';
import { allowedOrigins, loadLiveEnvironment, resolveMode, startupLine } from '../src/config.js';

describe('explicit relay mode selection', () => {
  it('keeps the legacy mock default and ignores the legacy --mock flag', () => {
    expect(resolveMode([], {})).toBe('mock');
    expect(resolveMode(['--mock'], { RELAY_MODE: 'live' })).toBe('live');
    expect(resolveMode([], { DEMO_MODE: '1' })).toBe('mock');
    expect(() => resolveMode([], { RELAY_MODE: 'invalid' })).toThrow('Invalid RELAY_MODE');
  });
  it('forces live even over a mock shell variable and --mock', () => {
    expect(resolveMode(['--live', '--mock'], { RELAY_MODE: 'mock' })).toBe('live');
  });
  it('never loads credentials for mock and never falls back when live credentials are missing', () => {
    const load = vi.fn(() => ({}));
    loadLiveEnvironment('mock', {}, load); expect(load).not.toHaveBeenCalled();
    expect(() => loadLiveEnvironment('live', {}, load)).toThrow('Missing GNANI_API_KEY');
    expect(() => loadLiveEnvironment('live', {}, () => { throw new Error('not exposed'); })).toThrow('Missing GNANI_API_KEY');
  });
  it('preserves the existing file key override and shell precedence for other variables', () => {
    const shell = { GNANI_API_KEY: 'synthetic-shell', RELAY_MODE: 'live', PORT: '8787' };
    loadLiveEnvironment('live', shell, () => ({ GNANI_API_KEY: 'synthetic-file', RELAY_MODE: 'mock', PORT: '9999' }));
    expect(shell.GNANI_API_KEY === 'synthetic-file').toBe(true);
    expect(shell.PORT).toBe('8787'); expect(resolveMode([], shell)).toBe('live');
    expect(() => loadLiveEnvironment('live', shell, () => ({ GNANI_API_KEY: '' }))).toThrow('Missing GNANI_API_KEY');
  });
  it('reports mode, port, origin count and key presence without values', () => {
    expect(startupLine('live', 8787, 2, true)).toBe('relay mode=live port=8787 origins=2 gnani_key=present');
    expect(startupLine('mock', 8787, 2, false)).toContain('gnani_key=absent');
    expect(allowedOrigins(undefined).size).toBe(2);
    expect(allowedOrigins('http://localhost:3000,http://localhost:3000').size).toBe(1);
    expect(() => allowedOrigins('http://localhost:3000/path')).toThrow('Invalid ALLOWED_ORIGINS');
  });
});
