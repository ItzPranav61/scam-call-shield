/** Only the exact opt-in enables recording layout; ambiguous duplicate values do not. */
export function isRecordMode(params: Record<string, string | string[] | undefined>): boolean {
  return params.record === '1';
}
