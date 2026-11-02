export function wav(): string {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  const tag = (offset: number, text: string) => [...text].forEach((c, i) => { bytes[offset + i] = c.charCodeAt(0); });
  tag(0, 'RIFF'); view.setUint32(4, 38, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, 'data'); view.setUint32(40, 2, true);
  return btoa(String.fromCharCode(...bytes));
}
