import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const origin = 'https://www.boostd.app';
const report = { testedAt: new Date().toISOString(), origin, stages: [], bytesDownloaded: 0, limits: { maxConcurrency: 20, maxRequests: 200, maxBytes: 8000000, timeoutMs: 8000 }, stopped: false };
let requests = 0;
const started = performance.now();
const round = value => Math.round(value);
async function request(url, options = {}) {
  if (++requests > report.limits.maxRequests || report.bytesDownloaded >= report.limits.maxBytes || performance.now() - started > 55000) throw new Error('Test safety budget reached');
  const begin = performance.now();
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(report.limits.timeoutMs), headers: { 'User-Agent': 'BoostD-Owner-Capacity-Check/1.0', ...options.headers } });
  const ttfb = performance.now() - begin;
  const data = await response.arrayBuffer();
  report.bytesDownloaded += data.byteLength;
  return { status: response.status, ms: performance.now() - begin, ttfb, bytes: data.byteLength, cache: response.headers.get('x-vercel-cache'), contentType: response.headers.get('content-type'), data, headers: response.headers };
}
async function stage(name, concurrency, count, targets, options = {}) {
  const samples = [];
  let next = 0;
  const begin = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (!report.stopped) {
      const index = next++;
      if (index >= count) return;
      try {
        const result = await request(targets[index % targets.length], options);
        samples.push(result);
        if (result.status === 429 || result.status >= 500) report.stopped = true;
      } catch (error) {
        samples.push({ status: 0, ms: performance.now() - begin, error: error.message });
        report.stopped = true;
      }
    }
  }));
  const sorted = samples.map(item => item.ms).sort((a, b) => a - b);
  const status = {};
  const caches = {};
  for (const sample of samples) { status[sample.status] = (status[sample.status] || 0) + 1; if (sample.cache) caches[sample.cache] = (caches[sample.cache] || 0) + 1; }
  const elapsed = performance.now() - begin;
  const result = { name, concurrency, completed: samples.length, status, caches, durationMs: round(elapsed), requestsPerSecond: +(samples.length / (elapsed / 1000)).toFixed(1), medianMs: round(sorted[Math.floor(sorted.length * .5)] || 0), p95Ms: round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)] || 0), maxMs: round(sorted.at(-1) || 0), errors: samples.filter(item => item.error).map(item => item.error) };
  report.stages.push(result);
  console.log(JSON.stringify(result));
  if (result.p95Ms > 3000) report.stopped = true;
}

try {
  const home = await request(origin + '/');
  if (home.status !== 200) throw new Error(`Homepage returned ${home.status}`);
  const html = new TextDecoder().decode(home.data);
  report.baseline = { status: home.status, ms: round(home.ms), cache: home.cache };
  const paths = ['/', '/login', '/privacy', '/terms'].map(path => origin + path);
  for (const concurrency of [1, 5, 20]) {
    if (report.stopped) break;
    await stage('Public HTML routes', concurrency, concurrency * 5, paths);
  }
  const assetPaths = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(match => match[1]))].slice(0, 4);
  if (!report.stopped && assetPaths.length) await stage('Public JS/CSS assets', 4, assetPaths.length, assetPaths.map(path => origin + path));
  if (!report.stopped) await stage('Creator API serverless fallback (no external scraping)', 3, 9, [origin + '/api/creator-profile?url=' + encodeURIComponent('https://x.com/boostdofficial')]);
  const video = await request(origin + '/dashboard.webm', { method: 'HEAD' });
  report.video = { status: video.status, bytes: Number(video.headers.get('content-length')), cache: video.cache, cacheControl: video.headers.get('cache-control') };
  const source = await readFile('src/lib/supabase.ts', 'utf8');
  const dbUrl = source.match(/supabaseUrl = .*?'(https:[^']+)'/)[1];
  const anonKey = source.match(/supabaseKey = .*?'(eyJ[^']+)'/)[1];
  if (!report.stopped) await stage('Anonymous feature-flags read (not authenticated workload)', 3, 12, [`${dbUrl}/rest/v1/feature_flags?select=feature_name,enabled&limit=10`], { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
} catch (error) { report.error = error.message; }
report.requests = requests;
report.elapsedMs = round(performance.now() - started);
await writeFile('artifacts/capacity-results-2026-10-27.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({requests, bytes: report.bytesDownloaded, stopped:report.stopped, error: report.error, video: report.video}));
