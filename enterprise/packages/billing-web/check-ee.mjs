import spawn from 'cross-spawn';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';
const dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT_PATH = path.resolve(dirname);
const ENCODING_TYPE = 'utf8';
const NEW_LINE_CHAR = '\n';

class CliLogs {
  constructor() {
    this._logs = [];
    this.log = this.log.bind(this);
  }

  log(log) {
    const cleanLog = log.trim();
    if (cleanLog.length) {
      this._logs.push(cleanLog);
    }
  }

  get logs() {
    return this._logs;
  }

  get joinedLogs() {
    return this.logs.join(NEW_LINE_CHAR);
  }
}

function pnpmRun(...args) {
  const logData = new CliLogs();
  let pnpmProcess;

  return new Promise((resolve, reject) => {
    const processOptions = {
      cwd: ROOT_PATH,
      env: process.env,
    };

    pnpmProcess = spawn('pnpm', args, processOptions);

    pnpmProcess.stdin.setEncoding(ENCODING_TYPE);
    pnpmProcess.stdout.setEncoding(ENCODING_TYPE);
    pnpmProcess.stderr.setEncoding(ENCODING_TYPE);
    pnpmProcess.stdout.on('data', logData.log);
    pnpmProcess.stderr.on('data', logData.log);

    pnpmProcess.on('close', (code) => {
      if (code !== 0) {
        reject(logData.joinedLogs);
      } else {
        resolve(logData.joinedLogs);
      }
    });
  });
}

const hasSrcFolder = fs.existsSync(path.resolve(ROOT_PATH, 'src'));
if (hasSrcFolder) {
  await pnpmRun('build:esm');
  await pnpmRun('build:types');
}
