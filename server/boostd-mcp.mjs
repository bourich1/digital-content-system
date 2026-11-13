import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const icon = { src: 'https://www.boostd.app/logo%20black.png', mimeType: 'image/png' };
const ideaStatuses = ['Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted'];
const live = process.argv.includes('--live');
const writePermissions = [
  { role: 'boostd_mcp_tasks_create', flag: 'BOOSTD_MCP_ENABLE_TASK_CREATION', tools: ['create_task'] },
  { role: 'boostd_mcp_ideas_write', flag: 'BOOSTD_MCP_ENABLE_IDEA_WRITES', tools: ['create_content_idea', 'update_content_idea_status'] },
  { role: 'boostd_mcp_calendar_write', flag: 'BOOSTD_MCP_ENABLE_CALENDAR_WRITES', tools: ['schedule_collaboration'] },
  { role: 'boostd_mcp_workspace', flag: 'BOOSTD_MCP_ENABLE_CREATOR_WRITES', tools: ['add_inspiration_creator'] },
];
const workspaceRole = 'boostd_mcp_workspace';
const supabaseBase = process.env.BOOSTD_SUPABASE_URL ?? 'https://erzksxgbbdxzjdtssuyv.supabase.co';
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supabaseBase) &&
    !/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(supabaseBase)) {
  throw new Error('BOOSTD_SUPABASE_URL must be a hosted Supabase HTTPS origin or a local loopback origin.');
}
const decodeClaims = value => JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'));
const title = { type: 'string', minLength: 1, maxLength: 200 };
const dateTime = { type: 'string', format: 'date-time' };
const date = { type: 'string', format: 'date', maxLength: 10 };
const accountReadTools = [
  {
    name: 'open_focus_room',
    description: 'Return a Boostd Focus Room link with the selected duration. Open the link and press Start to begin.',
    inputSchema: {
      type: 'object', properties: { minutes: { type: 'integer', minimum: 1, maximum: 180 } },
      required: ['minutes'], additionalProperties: false,
    },
  },
  {
    name: 'list_collaborations',
    description: 'List collaborations where the signed-in user is the owner or partner.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_calendar',
    description: 'List collaboration posting dates on the Boostd calendar within an inclusive date range.',
    inputSchema: {
      type: 'object', properties: { from: date, to: date }, required: ['from', 'to'], additionalProperties: false,
    },
  },
  {
    name: 'list_tools',
    description: 'Read the Boostd tools catalog when the workspace has access.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
].map(tool => ({ ...tool, annotations: { readOnlyHint: true, openWorldHint: false } }));

function writeTool(name, description, properties, required, idempotentHint = false) {
  return {
    name, description,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint, openWorldHint: false },
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
  };
}

const protocolVersions = ['2025-11-25', '2025-06-18', '2025-03-26'];
const tools = [
  {
    name: 'list_tasks',
    description: 'List fictional Boostd tasks from the local demo workspace.',
    annotations: { readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: { completed: { type: 'boolean' } },
      additionalProperties: false,
    },
  },
  {
    name: 'list_content_ideas',
    description: 'List fictional Boostd content ideas from the local demo workspace.',
    annotations: { readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  writeTool('create_task', 'Create a task in the demo workspace. Supply due_at with an explicit time zone when requested.',
    { title, due_at: dateTime }, ['title']),
  writeTool('start_focus_session', 'Start a demo focus countdown and return the Boostd Focus Room link. This does not start the timer on the website.',
    { minutes: { type: 'integer', minimum: 1, maximum: 180 } }, ['minutes']),
  writeTool('add_inspiration_creator', 'Save an Instagram profile to the demo inspiration list without fetching its contents.',
    { name: title, profile_url: { type: 'string', maxLength: 512 } }, ['name', 'profile_url'], true),
  writeTool('create_content_idea', 'Capture a new demo content idea with status Idea.',
    { title, notes: { type: 'string', maxLength: 2000 } }, ['title']),
  writeTool('update_content_idea_status', 'Update an idea using its ID from list_content_ideas. Use Filmed for an idea the user has filmed.',
    { id: title, status: { type: 'string', enum: ideaStatuses } }, ['id', 'status'], true),
  writeTool('schedule_collaboration', 'Set the posting date for a collaboration owned by the signed-in user.',
    { id: title, posting_date: date }, ['id', 'posting_date'], true),
];

function availableTools(readOnly, identity) {
  const candidates = readOnly ? [...tools, ...accountReadTools] : tools.filter(tool => tool.name !== 'schedule_collaboration');
  return candidates.filter(tool => !readOnly || tool.annotations.readOnlyHint ||
    identity?.writeTools.includes(tool.name)).map(tool => ({
    ...tool,
    description: readOnly ? tool.description.replace('fictional ', '').replace(/(?:local )?demo workspace/, 'signed-in workspace') : tool.description,
    icons: [icon],
  }));
}

const tasks = [
  { id: 'demo-task-1', title: 'Draft the Reel script', is_completed: false },
  { id: 'demo-task-2', title: 'Choose the Reel topic', is_completed: true },
];
const ideas = [{ id: 'demo-idea-1', title: 'A week in my creator workflow', status: 'Idea', created_at: '2026-11-11T09:00:00Z' }];
const creators = new Map();
let focusSession;

function validValue(value, schema) {
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'integer') return Number.isInteger(value) && value >= schema.minimum && value <= schema.maximum;
  if (typeof value !== 'string' || !value.trim() || value.length > (schema.maxLength ?? 200)) return false;
  if (schema.enum) return schema.enum.includes(value);
  if (schema.format === 'date') {
    const day = Date.parse(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(day) &&
      new Date(day).toISOString().slice(0, 10) === value;
  }
  if (schema.format === 'date-time') {
    const parts = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
    if (!parts || !Number.isFinite(Date.parse(value))) return false;
    const day = Date.parse(parts[1]);
    return Number.isFinite(day) && new Date(day).toISOString().slice(0, 10) === parts[1];
  }
  return true;
}

function instagramProfile(value) {
  try {
    const url = new URL(value);
    const handle = /^\/([a-z0-9._]{1,30})\/?$/i.exec(url.pathname)?.[1]?.toLowerCase();
    if (url.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(url.hostname) &&
        !url.username && !url.password && !url.port && handle &&
        !['accounts', 'direct', 'explore', 'p', 'reel', 'reels', 'stories'].includes(handle)) {
      return `https://www.instagram.com/${handle}/`;
    }
  } catch {
    return;
  }
}

function runTool(name, args) {
  switch (name) {
    case 'list_tasks':
      return { tasks: tasks.filter(task => args.completed === undefined || task.is_completed === args.completed) };
    case 'list_content_ideas':
      return { ideas };
    case 'create_task': {
      const task = { id: randomUUID(), title: args.title.trim(), due_date: args.due_at ?? null, is_completed: false };
      tasks.push(task);
      return { task };
    }
    case 'start_focus_session': {
      const now = Date.now();
      if (focusSession && Date.parse(focusSession.ends_at) > now) {
        return { focus_session: focusSession, already_running: true };
      }
      focusSession = {
        id: randomUUID(), minutes: args.minutes, started_at: new Date(now).toISOString(),
        ends_at: new Date(now + args.minutes * 60_000).toISOString(),
        focus_room_url: 'https://www.boostd.app/focus',
      };
      return { focus_session: focusSession };
    }
    case 'add_inspiration_creator': {
      const profile_url = instagramProfile(args.profile_url);
      if (!profile_url) return { error: 'Supply an HTTPS Instagram profile URL.' };
      if (!creators.has(profile_url)) {
        creators.set(profile_url, { id: randomUUID(), name: args.name.trim(), profile_url });
      }
      return { creator: creators.get(profile_url) };
    }
    case 'create_content_idea': {
      const idea = {
        id: randomUUID(), title: args.title.trim(), notes: args.notes?.trim() ?? null,
        status: 'Idea', created_at: new Date().toISOString(),
      };
      ideas.push(idea);
      return { idea };
    }
    case 'update_content_idea_status': {
      const idea = ideas.find(item => item.id === args.id);
      if (!idea) return { error: 'Idea not found. Use an ID from list_content_ideas.' };
      idea.status = args.status;
      return { idea };
    }
  }
}

async function verifyUser(token, remote = false) {
  const key = process.env.BOOSTD_SUPABASE_PUBLIC_KEY;
  if (!token || !key) return { error: 'Live mode requires a Boostd user access token and Supabase public key.' };
  try {
    const role = decodeClaims(token).role;
    const scopedRole = role === workspaceRole || writePermissions.some(permission => permission.role === role);
    if ((role !== 'authenticated' && !(remote && scopedRole)) ||
        (!key.startsWith('sb_publishable_') && decodeClaims(key).role !== 'anon')) {
      return { error: 'Use a signed-in user token and a Supabase publishable or anon key.' };
    }
    const headers = { apikey: key, Authorization: `Bearer ${token}` };
    const auth = await fetch(`${supabaseBase}/auth/v1/user`, {
      headers, redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (!auth.ok) return { error: 'Boostd could not verify the user session. Sign in again.' };
    const user = await auth.json();
    if (typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id) || user.is_anonymous) {
      return { error: 'Boostd requires a signed-in account.' };
    }
    return { user, headers };
  } catch {
    return { error: 'Boostd could not verify the user session.' };
  }
}

async function readLive(name, args, identity) {
  const account = identity ?? await verifyUser(process.env.BOOSTD_USER_ACCESS_TOKEN);
  if (account.error) return account;
  const { user, headers } = account;
  if (name === 'open_focus_room') {
    return { minutes: args.minutes, focus_room_url: `https://www.boostd.app/focus?minutes=${args.minutes}` };
  }
  try {
    if (name === 'list_tools') return await readToolCatalog(user.id, headers);
    if (name === 'list_calendar' || name === 'list_collaborations') {
      return await readCollaborations(name, args, user.id, headers);
    }
    const tasksRequested = name === 'list_tasks';
    const table = tasksRequested ? 'tasks' : 'content_ideas';
    const query = new URLSearchParams({
      select: tasksRequested ? 'id,title,is_completed,due_date,created_at' : 'id,title,status,created_at',
      user_id: `eq.${user.id}`,
      order: 'created_at.desc,id.desc',
      limit: '50',
    });
    if (tasksRequested && args.completed !== undefined) query.set('is_completed', `eq.${args.completed}`);
    const response = await fetch(`${supabaseBase}/rest/v1/${table}?${query}`, {
      headers, redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { error: 'Boostd could not read the workspace with this session.' };
    return { [tasksRequested ? 'tasks' : 'ideas']: await response.json(), limit: 50 };
  } catch {
    return { error: 'Could not read Boostd. Check the session, public key, and network connection.' };
  }
}

async function readRows(table, params, headers) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${supabaseBase}/rest/v1/${table}?${query}`, {
    headers, redirect: 'error', signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Boostd read failed.');
  return response.json();
}

async function readCollaborations(name, args, owner, headers) {
  const calendar = name === 'list_calendar';
  const query = new URLSearchParams({
    select: 'id,brand_name,posting_date,status,partner_status',
    order: calendar ? 'posting_date.asc,id.asc' : 'created_at.desc,id.desc',
    limit: '50',
  });
  const participant = `or(user_id.eq.${owner},partner_id.eq.${owner})`;
  if (calendar) {
    if (args.from > args.to) return { error: 'The calendar start date must be before or equal to the end date.' };
    query.set('and', `(${participant},or(partner_status.eq.accepted,partner_status.is.null,partner_id.is.null))`);
    query.append('posting_date', `gte.${args.from}`);
    query.append('posting_date', `lte.${args.to}`);
  } else {
    query.set('or', `(user_id.eq.${owner},partner_id.eq.${owner})`);
  }
  const rows = await readRows('collaborations', query, headers);
  return { [calendar ? 'events' : 'collaborations']: rows, limit: 50 };
}

async function readToolCatalog(owner, headers) {
  const [profiles, settings] = await Promise.all([
    readRows('profiles', { select: 'can_access_tools', id: `eq.${owner}`, limit: '1' }, headers),
    readRows('platform_settings', { select: 'setting_value', id: 'eq.tools_page', limit: '1' }, headers),
  ]);
  if (!profiles[0] || profiles[0].can_access_tools === false || settings[0]?.setting_value?.enabled === false) {
    return { error: 'The tools catalog is unavailable for this workspace.' };
  }
  const catalog = await readRows('tools', {
    select: 'id,name,url,description,logo_url,category', order: 'created_at.desc,id.desc', limit: '50',
  }, headers);
  return { tools: catalog, limit: 50 };
}

async function createLiveTask(args, identity) {
  try {
    const response = await fetch(`${supabaseBase}/rest/v1/tasks?select=id,title,due_date,is_completed`, {
      method: 'POST',
      headers: {
        ...identity.headers,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: identity.user.id,
        title: args.title.trim(),
        due_date: args.due_at ?? null,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { error: 'Boostd rejected task creation.' };
    const [task] = await response.json();
    return task ? { task } : { error: 'Boostd did not return the created task. Check the task list before retrying.' };
  } catch {
    return { error: 'Task creation could not be confirmed. Check the task list before retrying.' };
  }
}

async function writeLiveIdea(name, args, identity) {
  const creating = name === 'create_content_idea';
  if (!creating && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(args.id)) {
    return { error: 'Use an idea ID from list_content_ideas.' };
  }
  const query = new URLSearchParams({ select: 'id,title,status,created_at' });
  if (!creating) {
    query.set('id', `eq.${args.id}`);
    query.set('user_id', `eq.${identity.user.id}`);
  }
  try {
    const response = await fetch(`${supabaseBase}/rest/v1/content_ideas?${query}`, {
      method: creating ? 'POST' : 'PATCH',
      headers: { ...identity.headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(creating
        ? { user_id: identity.user.id, title: args.title.trim(), notes: args.notes?.trim() ?? null, status: 'Idea' }
        : { status: args.status }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { error: 'Boostd rejected the idea change.' };
    const [idea] = await response.json();
    return idea ? { idea } : { error: 'No idea was changed. Check the idea list before retrying.' };
  } catch {
    return { error: 'The idea change could not be confirmed. Check the idea list before retrying.' };
  }
}

async function scheduleCollaboration(args, identity) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(args.id)) {
    return { error: 'Use a collaboration ID from list_collaborations.' };
  }
  const query = new URLSearchParams({
    id: `eq.${args.id}`, user_id: `eq.${identity.user.id}`, select: 'id,brand_name,posting_date',
  });
  try {
    const response = await fetch(`${supabaseBase}/rest/v1/collaborations?${query}`, {
      method: 'PATCH',
      headers: { ...identity.headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ posting_date: args.posting_date }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { error: 'Boostd rejected the calendar change.' };
    const [collaboration] = await response.json();
    return collaboration ? { collaboration } : { error: 'No owned collaboration was changed.' };
  } catch {
    return { error: 'The calendar change could not be confirmed. Check the calendar before retrying.' };
  }
}

async function saveInspirationCreator(args, identity) {
  const profileUrl = instagramProfile(args.profile_url);
  if (!profileUrl) return { error: 'Supply an HTTPS Instagram profile URL.' };
  try {
    const query = new URLSearchParams({
      on_conflict: 'user_id,profile_url', select: 'id,name,platform,profile_url',
    });
    const response = await fetch(`${supabaseBase}/rest/v1/creators?${query}`, {
      method: 'POST',
      headers: { ...identity.headers, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id: identity.user.id, name: args.name.trim(), profile_url: profileUrl, platform: 'Instagram' }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { error: 'Boostd rejected the creator.' };
    const [creator] = await response.json();
    return creator ? { creator } : { profile_url: profileUrl, already_saved: true };
  } catch {
    return { error: 'The creator could not be saved. Check Creator Inspiration before retrying.' };
  }
}

async function callTool(params, readOnly, identity) {
  const args = params?.arguments === undefined ? {} : params.arguments;
  const name = params?.name;
  const schema = availableTools(readOnly, identity).find(tool => tool.name === name)?.inputSchema;
  if (!schema) return { error: 'Unknown tool' };
  if (!args || typeof args !== 'object' || Array.isArray(args) ||
      schema.required?.some(key => !Object.hasOwn(args, key)) ||
      Object.entries(args).some(([key, value]) =>
        !Object.hasOwn(schema.properties, key) || !validValue(value, schema.properties[key]))) {
    return { error: 'Invalid tool arguments' };
  }
  let data;
  if (!readOnly) data = runTool(name, args);
  else if (name === 'create_task') data = await createLiveTask(args, identity);
  else if (name === 'schedule_collaboration') data = await scheduleCollaboration(args, identity);
  else if (name === 'add_inspiration_creator') data = await saveInspirationCreator(args, identity);
  else if (identity?.writeTools.includes(name)) data = await writeLiveIdea(name, args, identity);
  else data = await readLive(name, args, identity);
  if (data.error) return { result: { isError: true, content: [{ type: 'text', text: data.error }] } };
  const result = { demo: !readOnly, ...data };
  return { result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result } };
}

async function respond(request, readOnly, identity) {
  if (request?.jsonrpc !== '2.0' || typeof request.method !== 'string' ||
      ('id' in request && typeof request.id !== 'string' && typeof request.id !== 'number')) {
    return { id: null, error: { code: -32600, message: 'Invalid request' } };
  }
  if (!('id' in request)) return;

  const { id, method, params } = request;
  switch (method) {
    case 'initialize':
      return {
        id,
        result: {
          protocolVersion: protocolVersions.includes(params?.protocolVersion)
            ? params.protocolVersion : protocolVersions[0],
          capabilities: { tools: {} },
          serverInfo: { name: readOnly ? 'boostd' : 'boostd-demo', title: 'Boostd', version: '0.3.0', icons: [icon] },
        },
      };
    case 'ping':
      return { id, result: {} };
    case 'tools/list':
      return { id, result: { tools: availableTools(readOnly, identity) } };
    case 'tools/call': {
      const { result, error } = await callTool(params, readOnly, identity);
      return error ? { id, error: { code: -32602, message: error } } : { id, result };
    }
    default:
      return { id, error: { code: -32601, message: 'Method not found' } };
  }
}

export async function handleMcpHttp(request, { requireWorkspaceRole = false } = {}) {
  const resource = process.env.BOOSTD_MCP_RESOURCE_URL;
  const clientId = process.env.BOOSTD_MCP_OAUTH_CLIENT_ID;
  if (!resource || !clientId) return new Response('Boostd MCP OAuth is unavailable.', { status: 503 });

  const endpoint = new URL(resource);
  const metadata = new URL(`/.well-known/oauth-protected-resource${endpoint.pathname}`, endpoint);
  const path = new URL(request.url).pathname;
  if (path === metadata.pathname && request.method === 'GET') {
    return Response.json({ resource, authorization_servers: [`${supabaseBase}/auth/v1`], bearer_methods_supported: ['header'] });
  }
  if (path !== endpoint.pathname) return new Response(null, { status: 404 });
  const origin = request.headers.get('origin');
  if (origin && origin !== endpoint.origin) return new Response(null, { status: 403 });

  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  const identity = token ? await verifyUser(token, true) : null;
  const claims = identity && !identity.error ? decodeClaims(token) : null;
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims || claims.sub !== identity.user.id || claims.client_id !== clientId || !audience.includes(resource) ||
      (requireWorkspaceRole && claims.role !== workspaceRole)) {
    return new Response(null, {
      status: 401,
      headers: { 'WWW-Authenticate': `Bearer resource_metadata="${metadata.href}"`, 'Cache-Control': 'no-store' },
    });
  }
  identity.writeTools = writePermissions
    .filter(permission => (claims.role === workspaceRole || claims.role === permission.role) &&
      process.env[permission.flag] === 'true')
    .flatMap(permission => permission.tools);
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return new Response(null, { status: 415 });
  }

  let message;
  try {
    message = await request.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  const result = await respond(message, true, identity);
  return result
    ? Response.json({ jsonrpc: '2.0', ...result }, { headers: { 'Cache-Control': 'no-store' } })
    : new Response(null, { status: 202 });
}

async function runStdio() {
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' },
    }) + '\n');
    continue;
  }
  const response = await respond(request, live);
  if (response) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...response }) + '\n');
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runStdio();
