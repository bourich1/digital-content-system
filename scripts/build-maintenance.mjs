import { mkdir, readFile, writeFile } from 'node:fs/promises';
// A standalone build keeps the application and its bundles out of this deployment.
const logo = await readFile(new URL('../public/logo white.png', import.meta.url));
const page = (await readFile(new URL('../public/maintenance.html', import.meta.url), 'utf8'))
  .replace('/logo%20white.png', `data:image/png;base64,${logo.toString('base64')}`);
await mkdir('maintenance-dist', { recursive: true });
await writeFile('maintenance-dist/maintenance.html', page);
await writeFile('maintenance-dist/index.html', page);
console.log('Standalone maintenance page built.');
