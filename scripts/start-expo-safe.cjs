const { spawn } = require('node:child_process');
const path = require('node:path');

process.env.EXPO_NO_DEPENDENCY_VALIDATION = '1';

const expoCli = path.resolve(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'start', '--clear'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
