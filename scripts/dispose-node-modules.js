(async () => {
  if (isWindows()) {
    runExec('FOR /d /r . %d in (node_modules) DO @IF EXIST "%d" rm -rf "%d"');
  } else {
    runExec('find . -name "node_modules" -type d -prune -exec rm -rf \'{}\' +');
  }
})();

function isWindows() {
  return process.platform === 'win32';
}

function runExec(command) {
  const { exec } = require('child_process');

  // eslint-disable-next-line no-console
  console.log('running: ', command);

  exec(command, (error, stdout, stderr) => {
    // eslint-disable-next-line no-console
    console.log('stdout: ' + stdout);
    // eslint-disable-next-line no-console
    console.log('stderr: ' + stderr);
    if (error !== null) {
      // eslint-disable-next-line no-console
      console.log('exec error: ' + error);
    }
  });
}
