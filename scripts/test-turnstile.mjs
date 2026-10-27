import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/TurnstileCaptcha.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness() {
  const scripts = [], renders = [], removed = [], tokens = [], errors = [];
  let effect;
  const api = { render: (node, options) => { renders.push(options); return `widget-${renders.length}`; }, remove: id => removed.push(id) };
  const window = { setTimeout, clearTimeout };
  const context = {
    exports: {}, window,
    document: { createElement: () => ({ remove() {} }), head: { appendChild: script => scripts.push(script) } },
    require: name => name === 'react' ? {
      useRef: () => ({ current: {} }),
      useEffect: callback => { effect = callback; },
      useState: () => ['', value => errors.push(value)],
    } : { jsx: () => null, jsxs: () => null },
  };
  vm.runInNewContext(compiled, context);
  context.exports.default({ siteKey: 'test-site-key', theme: 'dark', action: 'login', resetKey: 0, onToken: token => tokens.push(token) });
  return {
    scripts, renders, removed, tokens, errors,
    mount: () => effect(),
    load: async () => { window.turnstile = api; scripts.at(-1).onload(); await Promise.resolve(); },
  };
}

test('Strict Mode remount shares one script and renders only the active widget', async () => {
  const h = harness();
  h.mount()();
  const cleanup = h.mount();
  assert.equal(h.scripts.length, 1);
  await h.load();
  assert.equal(h.renders.length, 1);
  assert.equal(h.renders[0].sitekey, 'test-site-key');
  cleanup();
  assert.deepEqual(h.removed, ['widget-1']);
});

test('Expired, timed-out and failed checks invalidate tokens; late callbacks cannot authorize an unmounted form', async () => {
  const h = harness();
  const cleanup = h.mount();
  await h.load();
  const callbacks = h.renders[0];
  callbacks.callback('valid-token');
  assert.equal(h.tokens.at(-1), 'valid-token');
  for (const event of ['expired-callback', 'timeout-callback', 'error-callback']) {
    callbacks.callback('valid-token');
    callbacks[event]();
    assert.equal(h.tokens.at(-1), '');
  }
  cleanup();
  callbacks.callback('late-token');
  assert.equal(h.tokens.at(-1), '');
});

test('A failed script can be retried, and resetting removes the consumed widget', async () => {
  const h = harness();
  const firstCleanup = h.mount();
  h.scripts[0].onerror();
  await Promise.resolve();
  await Promise.resolve();
  assert.match(h.errors.at(-1), /could not load/);
  firstCleanup();
  const cleanup = h.mount();
  assert.equal(h.scripts.length, 2);
  await h.load();
  h.renders[0].callback('consumed-token');
  cleanup();
  const resetCleanup = h.mount();
  assert.equal(h.tokens.at(-1), '');
  await Promise.resolve();
  assert.equal(h.renders.length, 2);
  resetCleanup();
});
