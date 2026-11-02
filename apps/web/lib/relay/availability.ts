export const LOCAL_RELAY_URL = 'ws://localhost:8787/ws';
export const HOSTED_LIVE_NOTICE = "Live mode runs on a local relay and isn't hosted in this deployment. See the README to run it locally.";

/** Never send a hosted preview visitor to a relay on their own computer by default. */
export function availableRelayUrl(configured: string | undefined, hostname: string, recording = false): string | null {
  if (configured?.trim()) return configured.trim();
  if (recording || hostname === 'localhost' || hostname === '127.0.0.1') return LOCAL_RELAY_URL;
  return null;
}
