// Run the local active candidate data pipeline in sequence.
//
// This intentionally uses the existing polite snippet extraction step. It does
// not add browser automation, proxies, or any block/security-check bypassing.

const { spawnSync } = require('node:child_process');

const commands = [
  ['npm', ['run', 'extract-snippets']],
  ['npm', ['run', 'extract-providers']],
  ['npm', ['run', 'export']],
  ['npm', ['run', 'build-site']],
];

commands.forEach(([command, args]) => {
  const commandText = [command, ...args].join(' ');
  console.log(`\n> ${commandText}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
});
