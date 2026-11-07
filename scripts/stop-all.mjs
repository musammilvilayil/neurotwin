import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pidFile = path.join(root, '.neurotwin-dev.pid');
if (!existsSync(pidFile)) {
  console.log('No NeuroTwin dev session is running (or its PID file is missing). Use Ctrl+C in the launcher terminal if it is still open.');
  process.exit(0);
}
const pid = Number(readFileSync(pidFile, 'utf8').trim());
if (!Number.isInteger(pid) || pid <= 0) {
  unlinkSync(pidFile);
  throw new Error('Invalid NeuroTwin PID file. Removed it; check the launcher terminal.');
}
if (process.platform === 'win32') {
  const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) console.log('The launcher process may already have stopped.');
} else {
  try { process.kill(pid, 'SIGTERM'); } catch { console.log('The launcher process is already stopped.'); }
}
try { if (existsSync(pidFile)) unlinkSync(pidFile); } catch {}
console.log('NeuroTwin stop signal sent.');
