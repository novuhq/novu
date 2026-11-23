import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';
import { getPackageFolders } from './get-packages-folder.mjs';

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

function isProjectList(value) {
  return Array.isArray(value) && value.every((project) => typeof project === 'string');
}

function parseProjectList(text) {
  try {
    const value = JSON.parse(text);

    return isProjectList(value) ? value : null;
  } catch {
    return null;
  }
}

// CI decides which test jobs start from this list, so output that holds no project list is an error, not "no projects":
// an empty list would skip test jobs without anyone noticing.
function getAffectedCommandResult(str) {
  const outputLines = str
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim());

  for (const line of outputLines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      const projects = parseProjectList(line);
      if (projects) return projects;
    }
  }

  // Fallback: a JSON array printed on the same line as other text.
  for (const line of outputLines) {
    const jsonStart = line.indexOf('[');
    const jsonEnd = line.lastIndexOf(']') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const projects = parseProjectList(line.substring(jsonStart, jsonEnd));
      if (projects) return projects;
    }
  }

  throw new Error(`Nx printed no JSON project list:\n${str}`);
}

async function affectedProjectsContainingTask(taskName, baseBranch) {
  const cachePath = `${taskName + baseBranch.replace('/', '').replace('/', '')}-contain-task-cache.json`;

  const isCacheExists = existsSync(cachePath);
  if (isCacheExists) {
    const cache = readFileSync(cachePath, 'utf8');

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
  // console.log("nx output:\n" + affectedCommandResult)

  // pnpm nx show projects --affected --withTarget=[task] --base [base branch] --json
  let result = getAffectedCommandResult(affectedCommandResult);

  // Nx maps the `.source` submodule pointer to no project, so a bump of it, which is how most enterprise changes
  // reach this repo, would otherwise affect nothing.
  if (isEnterpriseSourceChanged(baseBranch)) {
    result = [...new Set([...result, ...(await enterpriseProjectsContainingTask(taskName))])];
  }

  writeFileSync(cachePath, JSON.stringify(result));

  return result;
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT_PATH,
    encoding: ENCODING_TYPE,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function isEnterpriseSourceChanged(baseBranch) {
  // Same range Nx diffs: from the merge base of the base branch and NX_HEAD (or HEAD), falling back to the base branch
  // itself when the shallow CI clone doesn't reach the merge base.
  const head = process.env.NX_HEAD || 'HEAD';
  let from = baseBranch;
  try {
    from = git('merge-base', baseBranch, head);
  } catch {}

  return git('diff', '--name-only', from, head, '--', '.source').length > 0;
}

async function enterpriseProjectsContainingTask(taskName) {
  const commandResult = await pnpmRun('nx', 'show', 'projects', '--withTarget', taskName, '--json');

  return getAffectedCommandResult(commandResult).filter((project) => project.startsWith('@novu/ee-'));
}

async function allProjectsContainingTask(taskName) {
  const cachePath = `${taskName}-all-contain-task-cache.json`;

  const isCacheExists = existsSync(cachePath);
  if (isCacheExists) {
    const cache = readFileSync(cachePath, 'utf8');

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

  const result = getAffectedCommandResult(affectedCommandResult);

  writeFileSync(cachePath, JSON.stringify(result));

  return result;
}

async function printAffectedProjectsContainingTask() {
  const { providers, packages, libs } = await getPackageFolders(['providers', 'packages', 'libs']);

  let projects =
    BASE_BRANCH_NAME === ALL_FLAG
      ? await allProjectsContainingTask(TASK_NAME)
      : await affectedProjectsContainingTask(TASK_NAME, BASE_BRANCH_NAME);
  const allProjects = projects;

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
  } else if (GROUP === 'all') {
    console.log(JSON.stringify(allProjects));
  } else {
    console.log(JSON.stringify(projects));
  }
}

printAffectedProjectsContainingTask().catch((error) => {
  console.error(error);
  process.exit(1);
});
