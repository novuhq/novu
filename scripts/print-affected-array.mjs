import { getPackageFolders } from './get-packages-folder.mjs';
import spawn from 'cross-spawn';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';
const dirname = path.dirname(fileURLToPath(import.meta.url));
const processArguments = process.argv.slice(2);

const ALL_FLAG = '--all';
const TASK_NAME = processArguments[0];
const BASE_BRANCH_NAME = processArguments[1];
const GROUP = processArguments[2];

const ROOT_PATH = path.resolve(dirname, '..');
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

function commaSeparatedListToArray(str) {
  return str
    .trim()
    .split(',')
    .map((element) => element.trim())
    .filter((element) => !!element.length);
}

function getAffectedCommandResult(str) {
  const outputLines = str.trim().split(/\r?\n/);
  if (outputLines.length > 2) {
    return outputLines.slice(2).join('');
  }

  return '';
}

async function affectedProjectsContainingTask(taskName, baseBranch) {
  const cachePath = taskName + baseBranch.replace('/', '').replace('/', '') + '-contain-task-cache.json';

  const isCacheExists = fs.existsSync(cachePath);
  if (isCacheExists) {
    const cache = fs.readFileSync(cachePath, 'utf8');

    return JSON.parse(cache);
  }

  const affectedCommandResult = await pnpmRun(
    'nx',
    'show',
    'projects',
    '--affected',
    '--withTarget',
    taskName,
    '--base',
    baseBranch,
    '--json'
  );

  // pnpm nx show projects --affected --withTarget=[task] --base [base branch] --json
  const result = JSON.parse(getAffectedCommandResult(affectedCommandResult));

  fs.writeFileSync(cachePath, JSON.stringify(result));

  return result;
}

async function allProjectsContainingTask(taskName) {
  const cachePath = taskName + '-all-contain-task-cache.json';

  const isCacheExists = fs.existsSync(cachePath);
  if (isCacheExists) {
    const cache = fs.readFileSync(cachePath, 'utf8');

    return JSON.parse(cache);
  }

  // pnpm nx show projects --affected --withTarget=[task] --files package.json --json
  const affectedCommandResult = await pnpmRun(
    'nx',
    'show',
    'projects',
    '--affected',
    '--withTarget',
    taskName,
    '--files',
    'package.json',
    '--json'
  );

  const result = JSON.parse(getAffectedCommandResult(affectedCommandResult));

  fs.writeFileSync(cachePath, JSON.stringify(result));

  return result;
}

async function printAffectedProjectsContainingTask() {
  const { providers, packages, libs } = await getPackageFolders(['providers', 'packages', 'libs']);

  let projects =
    BASE_BRANCH_NAME === ALL_FLAG
      ? await allProjectsContainingTask(TASK_NAME)
      : await affectedProjectsContainingTask(TASK_NAME, BASE_BRANCH_NAME);

  const foundProviders = projects.filter((project) => providers.includes(project));
  if (foundProviders.length) {
    projects = projects.filter((project) => !providers.includes(project));
  }

  const foundPackages = projects.filter((project) => packages.includes(project));
  if (foundPackages.length) {
    projects = projects.filter((project) => !packages.includes(project));
  }

  const foundLibs = projects.filter((project) => libs.includes(project));
  if (foundLibs.length) {
    projects = projects.filter((project) => !libs.includes(project));
  }

  if (GROUP === 'providers') {
    console.log(JSON.stringify(foundProviders));
  } else if (GROUP === 'packages') {
    console.log(JSON.stringify(foundPackages));
  } else if (GROUP === 'libs') {
    console.log(JSON.stringify(foundLibs));
  } else {
    console.log(JSON.stringify(projects));
  }
}

printAffectedProjectsContainingTask().catch((error) => {
  console.error(error);
  process.exit(1);
});
