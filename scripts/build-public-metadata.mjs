import { readFile, writeFile } from 'node:fs/promises';
import pages from '../src/lib/public-seo.json' with { type: 'json' };

// Emit real per-route HTML heads so crawlers do not need JavaScript for canonical tags.
const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8'));
const routeModules = { '/': 'src/pages/Landing.tsx', '/privacy': 'src/pages/Privacy.tsx', '/terms': 'src/pages/Terms.tsx', '/login': 'src/pages/Login.tsx' };
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const [path, page] of Object.entries(pages)) {
  let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1https://www.boostd.app${path}$2`);
  const values = { description: page.description, robots: page.robots,
    'og:title': page.title, 'twitter:title': page.title,
    'og:description': page.description, 'twitter:description': page.description,
    'og:url': `https://www.boostd.app${path}`, 'twitter:url': `https://www.boostd.app${path}` };
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*\\/?>)`);
    html = html.replace(pattern, (_, prefix, suffix) => `${prefix}${escape(value)}${suffix}`);
  }
  if (path !== '/') html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
  // Discover the route's CSS and JS in the first response instead of waiting for React.
  // Traverse static dependencies only; private routes remain lazy loaded.
  const seen = new Set();
  const hints = [];
  const preload = key => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing public route build entry: ${key}`);
    if (!template.includes(`"/${chunk.file}"`)) hints.push(`<link rel="modulepreload" href="/${chunk.file}" />`);
    for (const css of chunk.css ?? []) {
      if (!seen.has(css) && !template.includes(`"/${css}"`)) hints.push(`<link rel="stylesheet" href="/${css}" />`);
      seen.add(css);
    }
    for (const dependency of chunk.imports ?? []) preload(dependency);
  };
  preload(routeModules[path]);
  html = html.replace('</head>', `  ${hints.join('\n    ')}\n  </head>`);
  const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
  await writeFile(new URL(`../dist/${file}`, import.meta.url), html);
}
console.log('Built route-specific metadata for homepage, privacy, terms, and login.');
