import { execFileSync } from 'node:child_process';
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
const base = execFileSync('git', ['show', 'HEAD:src/App.tsx'], {encoding:'utf8'});
const next = base
  .replace("import PageMetadata from '@/components/PageMetadata';", "import PageMetadata from '@/components/PageMetadata';\nimport SecurityUpdateNotice from '@/components/SecurityUpdateNotice';")
  .replace('          <PageMetadata />', '          <PageMetadata />\n          <SecurityUpdateNotice />');
if (next === base || !next.includes('<SecurityUpdateNotice />')) throw new Error('Notice staging anchors missing');
const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {input:next, encoding:'utf8'}).trim();
git('update-index', '--cacheinfo', `100644,${blob},src/App.tsx`);
git('add', '--', 'src/components/SecurityUpdateNotice.tsx', 'src/components/SecurityUpdateNotice.css');
console.log(git('diff', '--cached', '--stat'));
