import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const serverProcess = spawn(process.execPath, ['server/server.js', '--dev'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

const clientProcess = spawn(`${npmCommand} run dev:client`, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  serverProcess.kill();
  clientProcess.kill();
  process.exit(exitCode);
}

serverProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    shutdown(code ?? 1);
  }
});

clientProcess.on('exit', (code) => {
  shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
