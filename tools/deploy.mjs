// Publica dist/ no ramo gh-pages (GitHub Pages) sem tocar na cópia de trabalho nem no ramo atual.
// Uso: npm run deploy (faz a build antes). O ramo gh-pages guarda só a build, um commit por publicação.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');
const BRANCH = 'gh-pages';

function git(args, env = {}) {
  return execFileSync('git', args, { cwd: DIST, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
}

if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/index.html não existe: rode `npm run build` antes.');
writeFileSync(join(DIST, '.nojekyll'), ''); // o Pages serve os arquivos como estão, sem Jekyll

const gitDir = resolve(execFileSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8' }).trim());
const tmp = mkdtempSync(join(tmpdir(), 'deploy-'));
// Índice temporário: o índice e os arquivos do ramo atual ficam intactos.
const env = { GIT_DIR: gitDir, GIT_WORK_TREE: DIST, GIT_INDEX_FILE: join(tmp, 'index') };
try {
  git(['add', '--all', '.'], env);
  const tree = git(['write-tree'], env);
  const source = git(['rev-parse', '--short', 'HEAD'], env);
  let parent = [];
  try {
    git(['fetch', '--quiet', 'origin', BRANCH], env);
    parent = ['-p', git(['rev-parse', 'FETCH_HEAD'], env)];
  } catch {
    console.log(`Ramo ${BRANCH} ainda não existe no remoto: será criado.`);
  }
  const commit = git(['commit-tree', tree, ...parent, '-m', `Publica a build de ${source}`], env);
  git(['push', 'origin', `${commit}:refs/heads/${BRANCH}`], env);
  console.log(`${BRANCH} ← ${commit.slice(0, 7)} (build de ${source})`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
