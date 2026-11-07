import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  console.log('\n> ' + [command, ...args].join(' '));
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed: ${command} ${args.join(' ')}`);
}

function pythonVersion(command, args = []) {
  const result = spawnSync(command, [...args, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

const candidates = isWin
  ? [{ command: 'py', args: ['-3.11'] }, { command: 'python', args: [] }]
  : [{ command: 'python3.11', args: [] }, { command: 'python3', args: [] }, { command: 'python', args: [] }];
const python = candidates.find(candidate => pythonVersion(candidate.command, candidate.args) === '3.11');
if (!python) {
  throw new Error('Python 3.11 was not found. Install Python 3.11 and ensure it is available in PATH.');
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 20) throw new Error('Node.js 20 or newer is required.');

console.log('NeuroTwin setup: Node.js ' + process.version + ', Python 3.11');
for (const directory of ['server', 'client']) {
  if (!existsSync(path.join(root, directory, 'node_modules'))) {
    run(npm, ['install', '--prefix', directory]);
  } else {
    console.log('JavaScript dependencies already present: ' + directory);
  }
}

const mlDir = path.join(root, 'services', 'ml');
const venvDir = path.join(mlDir, '.venv');
const pythonExe = isWin
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');
if (!existsSync(pythonExe)) {
  run(python.command, [...python.args, '-m', 'venv', venvDir]);
}

const requirementsPath = path.join(mlDir, 'requirements.txt');
const requirementsHash = createHash('sha256').update(readFileSync(requirementsPath)).digest('hex');
const stampPath = path.join(venvDir, '.neurotwin-requirements-sha256');
const installedHash = existsSync(stampPath) ? readFileSync(stampPath, 'utf8').trim() : '';
if (installedHash !== requirementsHash) {
  run(pythonExe, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  run(pythonExe, ['-m', 'pip', 'install', '-r', requirementsPath]);
  writeFileSync(stampPath, requirementsHash + '\n');
} else {
  console.log('Python ML dependencies already match requirements.txt');
}

const envPath = path.join(root, 'server', '.env');
const examplePath = path.join(root, 'server', '.env.example');
if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) throw new Error('server/.env.example is missing.');
  copyFileSync(examplePath, envPath);
  console.log('Created server/.env. Review JWT_SECRET before exposing the app beyond localhost.');
}

console.log('\nSetup complete. Start everything with: npm run dev:all');
