import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ASSET_LIMITS, checkReadmeAssets } from '../scripts/check-readme-assets.mjs';

function fixture(t, markdown) {
  const root = mkdtempSync(join(tmpdir(), 'readme-assets-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs/assets'), { recursive: true });
  writeFileSync(join(root, 'README.md'), markdown);
  return root;
}
// Header fixtures exist only in temporary test folders, never as README captures.
function gif(root, width = 960) {
  const bytes = Buffer.alloc(10);
  bytes.write('GIF89a'); bytes.writeUInt16LE(width, 6); bytes.writeUInt16LE(1, 8);
  const path = join(root, 'docs/assets/demo.gif'); writeFileSync(path, bytes); return path;
}

test('pending commented embeds and code examples do not require stand-in assets', t => {
  const root = fixture(t, '<!-- ![](docs/assets/demo.gif) -->\n```md\n![](missing.png)\n```');
  assert.deepEqual(checkReadmeAssets(root), { errors: [], imageCount: 0, assetCount: 0 });
});
test('existing local GIF and PNG pass, including the exact width boundary', t => {
  const root = fixture(t, '![Real app](docs/assets/demo.gif)\n![SAFE](docs/assets/shot-safe.png)');
  gif(root); writeFileSync(join(root, 'docs/assets/shot-safe.png'), Buffer.alloc(24));
  assert.deepEqual(checkReadmeAssets(root), { errors: [], imageCount: 2, assetCount: 2 });
});
test('missing active image fails', t => {
  const root = fixture(t, '![DANGER](docs/assets/shot-danger.png)');
  assert.match(checkReadmeAssets(root).errors.join('\n'), /Missing README image/);
});
test('empty alt fails for Markdown and HTML images', t => {
  const root = fixture(t, '![](docs/assets/demo.gif)\n<img src="docs/assets/demo.gif" alt=" ">');
  gif(root); assert.equal(checkReadmeAssets(root).errors.filter(error => error.includes('empty alt')).length, 2);
});
test('GIF and PNG files over limits fail even before embedding', t => {
  const root = fixture(t, '<!-- ![pending](docs/assets/demo.gif) -->');
  const path = gif(root); truncateSync(path, ASSET_LIMITS.gif + 1);
  const png = join(root, 'docs/assets/shot-safe.png'); writeFileSync(png, ''); truncateSync(png, ASSET_LIMITS.png + 1);
  assert.equal(checkReadmeAssets(root).errors.filter(error => error.includes('size limit')).length, 2);
});
test('GIF over 960px wide fails', t => {
  const root = fixture(t, '![Real app](docs/assets/demo.gif)'); gif(root, 961);
  assert.match(checkReadmeAssets(root).errors.join('\n'), /wider than 960px/);
});
test('malformed GIF fails without trusting its extension', t => {
  const root = fixture(t, '![Real app](docs/assets/demo.gif)');
  writeFileSync(join(root, 'docs/assets/demo.gif'), 'invalid');
  assert.match(checkReadmeAssets(root).errors.join('\n'), /invalid GIF header/);
});
test('reference images are resolved and missing definitions fail', t => {
  const root = fixture(t, '![Real app][demo]\n[demo]: docs/assets/demo.gif\n![Missing][unknown]'); gif(root);
  const result = checkReadmeAssets(root);
  assert.equal(result.assetCount, 1); assert.match(result.errors.join('\n'), /reference definition/);
});
test('external images are not fetched, but still need alt text', t => {
  const root = fixture(t, '![](https://example.invalid/capture.png)');
  assert.deepEqual(checkReadmeAssets(root).errors, ['README image has empty alt text']);
});
test('paths cannot escape the repository', t => {
  const root = fixture(t, '![Not an asset](../outside.gif)');
  assert.match(checkReadmeAssets(root).errors.join('\n'), /inside the repository/);
});
test('CLI returns nonzero for a missing image and zero for pending embeds', t => {
  const root = fixture(t, '![Missing](docs/assets/missing.png)');
  const script = new URL('../scripts/check-readme-assets.mjs', import.meta.url);
  assert.equal(spawnSync(process.execPath, [fileURLToPath(script), root]).status, 1);
  writeFileSync(join(root, 'README.md'), '<!-- ![pending](docs/assets/demo.gif) -->');
  assert.equal(spawnSync(process.execPath, [fileURLToPath(script), root]).status, 0);
});
