// `npm start`: build on first run (or with --rebuild), then launch the production server.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const uiEntry = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const serverEntry = fileURLToPath(new URL('../dist-server/index.js', import.meta.url));

const rebuild = process.argv.includes('--rebuild');
const needsBuild = rebuild || !existsSync(uiEntry) || !existsSync(serverEntry);

function run(script) {
  const result = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(`INFLOW: could not run "npm run ${script}": ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`INFLOW: "npm run ${script}" failed (exit ${result.status}). Fix the error above and run npm start again.`);
    return false;
  }
  return true;
}

if (needsBuild) {
  console.log('INFLOW: building (first run takes about a minute)…');
  if (!run('build') || !run('build:server')) {
    process.exit(1);
  }
}

if (!existsSync(serverEntry)) {
  console.error('INFLOW: dist-server/index.js is missing after the build. Nothing to start.');
  process.exit(1);
}

await import(pathToFileURL(serverEntry).href);
