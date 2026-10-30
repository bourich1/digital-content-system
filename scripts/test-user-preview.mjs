import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

function load(file, imports = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, URL, Request, Response, require: name => imports[name] };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

test('dashboard keeps an empty member empty even with old admin data in localStorage', async () => {
  const states = [], effects = [], requests = [], cacheReads = [];
  const react = {
    createElement: () => null,
    useState: initial => { const i = states.length; states.push(initial); return [initial, value => { states[i] = value; }]; },
    useEffect: effect => effects.push(effect),
  };
  const imports = {
    react: { ...react, default: react },
    'react-router-dom': { useNavigate: () => () => {} },
    '@/contexts/AuthContext': { useAuth: () => ({ user: { id: 'empty-member' }, isDemoMode: true }) },
    '@/lib/workspaceData': { workspaceRows: (table, id) => {
      requests.push([table, id]); return { order: async () => ({ data: [], error: null }) };
    } },
    sonner: { toast: { error: message => assert.fail(message) } },
  };
  const source = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  const context = {
    exports: {}, console,
    localStorage: { getItem: key => { cacheReads.push(key); return '[{"id":"admin-item"}]'; } },
    require: name => imports[name] || { motion: {} },
  };
  vm.runInNewContext(compiled, context);
  context.exports.default();
  effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(requests, [['content_ideas', 'empty-member'], ['tasks', 'empty-member'], ['collaborations', 'empty-member']]);
  assert.deepEqual(cacheReads, []);
  for (const rows of states.slice(0, 4)) assert.equal(rows.length, 0);
  assert.equal(states[4], false);
});

test('real Supabase query builder scopes two users and an empty account separately', async () => {
  const calls = [];
  const rows = [{ id: 'one', user_id: 'alice' }, { id: 'two', user_id: 'alice' }, { id: 'three', user_id: 'bob' }];
  const client = createClient('https://preview.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input)); calls.push(url);
      const owner = url.searchParams.get('user_id');
      return Response.json(rows.filter(row => `eq.${row.user_id}` === owner));
    } },
  });
  const { workspaceRows } = load('../src/lib/workspaceData.ts', { '@/lib/supabase': { supabase: client } });
  for (const table of ['content_ideas', 'tasks']) {
    const a = await workspaceRows(table, 'alice').order('created_at', { ascending: false });
    const b = await workspaceRows(table, 'bob');
    const empty = await workspaceRows(table, 'empty');
    assert.deepEqual(a.data.map(row => row.id), ['one', 'two']);
    assert.deepEqual(b.data.map(row => row.id), ['three']);
    assert.deepEqual(empty.data, []);
  }
  assert.equal(calls.length, 6);
  assert.throws(() => workspaceRows('tasks', ''), /workspace user/);
  assert.equal(calls.length, 6, 'missing identity never sends an unscoped request');
});

test('collaboration requests include ownership OR partnership and preserve date/relationship selection', async () => {
  let captured;
  const client = createClient('https://preview.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => { captured = new URL(String(input)); return Response.json([]); } },
  });
  const { workspaceRows } = load('../src/lib/workspaceData.ts', { '@/lib/supabase': { supabase: client } });
  await workspaceRows('collaborations', 'bob', '*,partner:profiles!partner_id(username)')
    .gte('posting_date', '2026-10-01').lte('posting_date', '2026-10-31');
  assert.equal(captured.searchParams.get('or'), '(user_id.eq.bob,partner_id.eq.bob)');
  assert.equal(captured.searchParams.get('posting_date'), 'gte.2026-10-01');
  assert.match(captured.searchParams.get('select'), /partner:profiles/);
});

test('preview blocks writes at the client transport, including RPC and Request objects', async () => {
  const { setPreviewUserId, createPreviewFetch } = load('../src/lib/previewTransport.ts');
  const calls = [];
  const transport = createPreviewFetch('https://custom.boostd.test', async (...args) => {
    calls.push(args); return Response.json({ ok: true });
  });
  setPreviewUserId('bob');
  for (const [path, method] of [['rest/v1/tasks', 'POST'], ['rest/v1/content_ideas', 'PATCH'],
    ['rest/v1/collaborations', 'DELETE'], ['rest/v1/rpc/respond_to_collaboration', 'POST'],
    ['storage/v1/object/images/logo.png', 'PUT'], ['functions/v1/action', 'POST']]) {
    assert.equal((await transport(new Request(`https://custom.boostd.test/${path}`, { method }))).status, 403);
  }
  assert.equal(calls.length, 0);
  assert.equal((await transport(new URL('https://custom.boostd.test/rest/v1/tasks'))).status, 200);
  assert.equal((await transport('https://custom.boostd.test/auth/v1/token', { method: 'POST' })).status, 200);
  assert.equal((await transport('https://unrelated.test/rest/v1/tasks', { method: 'POST' })).status, 200);
  setPreviewUserId(null);
  assert.equal((await transport('https://custom.boostd.test/rest/v1/tasks', { method: 'POST' })).status, 200);
  assert.equal(calls.length, 4);
});
