export type RelayMode = 'mock' | 'live';
type Environment = Record<string, string | undefined>;

/** Legacy --mock is intentionally inert; --live is the new explicit, overriding opt-in. */
export function resolveMode(args: readonly string[], environment: Environment): RelayMode {
  const mode = args.includes('--live') ? 'live' : environment.RELAY_MODE ?? 'mock';
  if (mode !== 'live' && mode !== 'mock') throw new Error('Invalid RELAY_MODE');
  return mode;
}

/** Keep legacy file precedence: the relay loads credentials, never a frontend or launcher. */
export function loadLiveEnvironment(mode: RelayMode, environment: Environment, load: () => Environment): void {
  if (mode !== 'live') return;
  let values: Environment;
  try { values = load(); }
  catch { throw new Error('Missing GNANI_API_KEY: live relay requires root environment configuration'); }
  for (const [name, value] of Object.entries(values)) {
    if (name === 'GNANI_API_KEY' || environment[name] === undefined) environment[name] = value;
  }
  if (!values.GNANI_API_KEY?.trim() || !environment.GNANI_API_KEY?.trim())
    throw new Error('Missing GNANI_API_KEY: live relay will not start');
}

export function allowedOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(origin => {
    try {
      const url = new URL(origin.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
          url.pathname !== '/' || url.search || url.hash) throw new Error();
      return url.origin;
    } catch { throw new Error('Invalid ALLOWED_ORIGINS'); }
  }));
}

export function startupLine(mode: RelayMode, port: number, origins: number, keyPresent: boolean): string {
  return `relay mode=${mode} port=${port} origins=${origins} gnani_key=${keyPresent ? 'present' : 'absent'}`;
}
