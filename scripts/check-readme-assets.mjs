import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ASSET_LIMITS = { gif: 10_000_000, png: 2_000_000, gifWidth: 960 };
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Local file checks only. Content, LIVE provenance and GIF duration need human review. */
export function checkReadmeAssets(root = repositoryRoot) {
  root = resolve(root);
  const errors = [];
  let markdown;
  try { markdown = readFileSync(resolve(root, 'README.md'), 'utf8'); }
  catch { return { errors: ['Cannot read README.md'], imageCount: 0, assetCount: 0 }; }
  markdown = markdown.replace(/<!--[\s\S]*?-->/g, '').replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
  const images = [];
  const definitions = new Map([...markdown.matchAll(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)]
    .map(match => [match[1].trim().toLowerCase(), match[2]]));
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]*))(?:\s+["'][^\n]*?["'])?\s*\)/g))
    images.push({ alt: match[1], src: match[2] ?? match[3] });
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    const id = (match[2] || match[1]).trim().toLowerCase();
    images.push({ alt: match[1], src: definitions.get(id) });
  }
  for (const match of markdown.matchAll(/<img\b([^>]+)>/gi)) {
    const attributes = Object.fromEntries([...match[1].matchAll(/(alt|src)\s*=\s*(["'])(.*?)\2/gi)]
      .map(attribute => [attribute[1].toLowerCase(), attribute[3]]));
    images.push({ alt: attributes.alt ?? '', src: attributes.src });
  }
  const files = new Set();
  const inside = path => {
    const name = relative(root, path);
    return name !== '..' && !name.startsWith(`..${win32.sep}`) && !name.startsWith('../') && !isAbsolute(name);
  };
  for (const image of images) {
    if (!image.alt.trim()) errors.push('README image has empty alt text');
    if (!image.src) { errors.push('README image has no path or reference definition'); continue; }
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(image.src)) continue; // Never fetch external URLs.
    let path;
    try { path = decodeURIComponent(image.src.split(/[?#]/)[0]); }
    catch { errors.push('README image has an invalid encoded path'); continue; }
    const target = resolve(root, path);
    if (isAbsolute(path) || win32.isAbsolute(path) || !inside(target)) {
      errors.push('README image path must stay inside the repository'); continue;
    }
    if (!existsSync(target)) { errors.push(`Missing README image: ${path}`); continue; }
    if (!statSync(target).isFile() || !inside(realpathSync(target))) {
      errors.push(`README image is not a local file: ${path}`); continue;
    }
    files.add(target);
  }
  function collect(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (entry.isFile() && /\.(gif|png)$/i.test(entry.name)) files.add(path);
    }
  }
  collect(resolve(root, 'docs/assets'));
  let assetCount = 0;
  for (const path of files) {
    const extension = extname(path).slice(1).toLowerCase();
    if (!['gif', 'png'].includes(extension)) continue;
    assetCount++;
    const name = relative(root, path).replaceAll('\\', '/');
    if (statSync(path).size > ASSET_LIMITS[extension]) errors.push(`${name} exceeds the ${extension.toUpperCase()} size limit`);
    if (extension === 'gif') {
      const header = Buffer.alloc(10);
      const descriptor = openSync(path, 'r');
      let bytes;
      try { bytes = readSync(descriptor, header, 0, header.length, 0); }
      finally { closeSync(descriptor); }
      if (bytes !== 10 || !['GIF87a', 'GIF89a'].includes(header.toString('ascii', 0, 6)) || !header.readUInt16LE(6) || !header.readUInt16LE(8))
        errors.push(`${name} has an invalid GIF header`);
      else if (header.readUInt16LE(6) > ASSET_LIMITS.gifWidth) errors.push(`${name} is wider than ${ASSET_LIMITS.gifWidth}px`);
    }
  }
  return { errors, imageCount: images.length, assetCount };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkReadmeAssets(process.argv[2]);
  if (result.errors.length) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  } else console.log(`README assets OK: ${result.imageCount} active images, ${result.assetCount} checked GIF/PNG files.`);
}
