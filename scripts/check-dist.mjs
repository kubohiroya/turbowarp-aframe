import {execFile} from 'node:child_process';
import {access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

try {
  await execFileAsync('git', ['rev-parse', '--verify', 'HEAD'], {cwd: repositoryRoot});
} catch {
  await access(new URL('../dist/turbowarp-aframe.js', import.meta.url));
  await access(new URL('../dist/extension-manifest.json', import.meta.url));
  process.stdout.write('Generated dist files exist; skipping git drift check before first commit.\n');
  process.exit(0);
}

const {stdout} = await execFileAsync(
  'git',
  ['status', '--short', '--untracked-files=all', '--', 'dist'],
  {cwd: repositoryRoot}
);

if (stdout.length > 0) {
  process.stderr.write('Generated dist files are not up to date:\n');
  process.stderr.write(stdout);
  process.exitCode = 1;
}
