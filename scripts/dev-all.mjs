import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const pidFile = path.join(root, '.neurotwin-dev.pid');
const children = [];
let stopping = false;

function runSetup() {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'setup.mjs')], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Automatic setup failed. Fix the error above and retry.');
}

function readEnvValue(file, key) {
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find(row => row.trim().startsWith(key + '='));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
}

function portReachable(host, port, timeout = 1200) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function start(label, command, args, cwd, env = process.env) {
  console.log('Starting ' + label + '...');
  const child = spawn(command, args, {
    cwd, env, stdio: 'inherit', shell: isWin, windowsHide: false,
  });
  children.push({ label, child });
  child.once('error', error => {
    console.error(label + ' failed to start:', error.message);
    stop(1);
  });
  child.once('exit', (code, signal) => {
    if (!stopping) {
      console.error(label + ' stopped' + (signal ? ' (' + signal + ')' : ' (exit ' + code + ')') + '. Stopping the other services.');
      stop(code && code !== 0 ? code : 1);
    }
  });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        if (isWin && child.pid) {
          spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        } else {
          child.kill('SIGTERM');
        }
      } catch {}
    }
  }
  try { if (existsSync(pidFile)) unlinkSync(pidFile); } catch {}
  setTimeout(() => process.exit(code), 300);
}

async function main() {
  if (process.versions.node.split('.')[0] < 20) throw new Error('Node.js 20 or newer is required.');
  runSetup();

  const mlDir = path.join(root, 'services', 'ml');
  const python = isWin
    ? path.join(mlDir, '.venv', 'Scripts', 'python.exe')
    : path.join(mlDir, '.venv', 'bin', 'python');
  if (!existsSync(python)) throw new Error('Python virtual environment was not created.');

  const envFile = path.join(root, 'server', '.env');
  const mongoUri = readEnvValue(envFile, 'MONGODB_URI');
  const serverEnv = { ...process.env };
  if (/^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(mongoUri)) {
    const match = mongoUri.match(/^mongodb:\/\/(?:localhost|127\.0\.0\.1)(?::(\d+))?/i);
    const port = Number(match?.[1] || 27017);
    if (!(await portReachable('127.0.0.1', port))) {
      console.log('Local MongoDB is not running. The API will use its bundled temporary MongoDB instance for this session.');
      serverEnv.MONGODB_URI = '';
    }
  } else if (!mongoUri) {
    console.log('No persistent MongoDB URI configured. The API will use its bundled temporary MongoDB instance.');
    serverEnv.MONGODB_URI = '';
  }

  writeFileSync(pidFile, String(process.pid) + '\n');
  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));
  process.on('exit', () => { try { if (existsSync(pidFile)) unlinkSync(pidFile); } catch {} });

  start('ML inference API (8001)', python, ['-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', '8001'], mlDir);
  start('Express backend (5000)', npm, ['run', 'dev', '--prefix', 'server'], root, serverEnv);
  start('React frontend (5173)', npm, ['run', 'dev', '--prefix', 'client', '--', '--host', '127.0.0.1'], root);

  console.log('\nNeuroTwin services are launching:');
  console.log('  Frontend:  http://localhost:5173');
  console.log('  Backend:   http://localhost:5000');
  console.log('  ML health: http://localhost:8001/health');
  console.log('\nPress Ctrl+C to stop all services.');
  setTimeout(() => {
    const open = isWin
      ? spawn('cmd', ['/c', 'start', '', 'http://localhost:5173'], { stdio: 'ignore', windowsHide: true })
      : null;
    if (open) open.unref();
  }, 2500);
}

main().catch(error => {
  console.error('\nNeuroTwin startup error:', error.message);
  stop(1);
});
