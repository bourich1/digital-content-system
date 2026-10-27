import { readFile, writeFile } from 'node:fs/promises';
import pages from '../src/lib/public-seo.json' with { type: 'json' };

// Emit real per-route HTML heads so crawlers do not need JavaScript for canonical tags.
const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
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
  const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
  await writeFile(new URL(`../dist/${file}`, import.meta.url), html);
}
console.log('Built route-specific metadata for homepage, privacy, terms, and login.');
