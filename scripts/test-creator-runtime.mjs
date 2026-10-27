import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Exercise emitted JavaScript in Node ESM, like the Vercel runtime, rather than
// relying on Vite's more permissive resolution of extensionless imports.
const root = await mkdtemp(join(tmpdir(), 'boostd-creator-runtime-'));
try {
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  for (const file of ['api/creator-profile.ts', 'server/creatorLookup.ts', 'src/lib/creatorProfile.ts']) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    const target = join(root, file.replace(/\.ts$/, '.js'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }
  const { default: handler } = await import(pathToFileURL(join(root, 'api/creator-profile.js')).href);
  async function invoke(method, url) {
    const headers = {};
    const response = { statusCode: 200, setHeader: (name, value) => { headers[name] = value; }, end: body => { response.body = JSON.parse(body); } };
    await handler({ method, url }, response);
    return { ...response, headers };
  }
  const success = await invoke('GET', '/api/creator-profile?url=' + encodeURIComponent('https://x.com/boostdofficial'));
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.imported, false);
  assert.equal(success.body.platform, 'X');
  assert.equal((await invoke('GET', '/api/creator-profile?url=invalid')).statusCode, 400);
  assert.equal((await invoke('GET', '/api/creator-profile?url=' + 'x'.repeat(601))).statusCode, 400);
  const wrongMethod = await invoke('POST', '/api/creator-profile');
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.headers.Allow, 'GET');
  console.log('PASS: Node ESM imports, X fallback, invalid input, input length, and method restrictions.');
} finally {
  // Verify the exact generated temporary directory before recursive cleanup.
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith('boostd-creator-runtime-'));
  await rm(root, { recursive: true, force: true });
}
