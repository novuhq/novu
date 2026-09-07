#!/usr/bin/env node

import { getPackageFolders } from './get-packages-folder.mjs';
import spawn from 'cross-spawn';
import { fileURLToPath } from 'url';
import path from 'path';
import fs, { existsSync, readFileSync, writeFileSync } from 'node:fs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const processArguments = process.argv.slice(2);

const BASE_BRANCH_NAME = processArguments[0] || 'origin/main';
const IS_ALL = processArguments[1] === '--all';

const ROOT_PATH = path.resolve(dirname, '..');
const ENCODING_TYPE = 'utf8';

// All test targets we need to check
const TEST_TARGETS = ['test:unit', 'test:e2e', 'test:e2e:ee', 'cypress:run', 'test'];

async function runNxCommand(args) {
  return new Promise((resolve, reject) => {
    const processOptions = {
      cwd: ROOT_PATH,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    };

    // Try npx nx first, fallback to pnpm nx
    const commands = [
      ['npx', 'nx', ...args],
      ['pnpm', 'nx', ...args],
    ];

    let currentCommand = 0;

    function tryCommand() {
      if (currentCommand >= commands.length) {
        reject(new Error('All nx commands failed'));
        return;
      }

      const [command, ...cmdArgs] = commands[currentCommand];
      const nxProcess = spawn(command, cmdArgs, processOptions);
      let output = '';
      let errorOutput = '';

      nxProcess.stdout.setEncoding(ENCODING_TYPE);
      nxProcess.stderr.setEncoding(ENCODING_TYPE);

      nxProcess.stdout.on('data', (data) => {
        output += data;
      });

      nxProcess.stderr.on('data', (data) => {
        errorOutput += data;
      });

      nxProcess.on('close', (code) => {
        if (code !== 0) {
          currentCommand++;
          if (currentCommand < commands.length) {
            tryCommand();
          } else {
            reject(new Error(`All commands failed. Last error: ${errorOutput}`));
          }
        } else {
          resolve(output);
        }
      });
    }

    tryCommand();
  });
}

function extractJsonFromOutput(str) {
  const outputLines = str.trim().split(/\r?\n/);

  for (const line of outputLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      return trimmedLine;
    }
  }

  for (const line of outputLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.includes('[') && trimmedLine.includes(']')) {
      const jsonStart = trimmedLine.indexOf('[');
      const jsonEnd = trimmedLine.lastIndexOf(']') + 1;
      return trimmedLine.substring(jsonStart, jsonEnd);
    }
  }

  return '[]';
}

async function getAllAffectedProjects() {
  const cacheKey = `.nx-cache-affected-${BASE_BRANCH_NAME.replace(/\//g, '-')}-${IS_ALL ? 'all' : 'pr'}.json`;
  const cachePath = path.join(ROOT_PATH, cacheKey);

  if (existsSync(cachePath)) {
    const cache = readFileSync(cachePath, 'utf8');
    return JSON.parse(cache);
  }

  try {
    // Simple approach: just get affected projects and assume common targets
    const args = IS_ALL
      ? ['show', 'projects', '--affected', '--files', 'package.json', '--json']
      : ['show', 'projects', '--affected', '--base', BASE_BRANCH_NAME, '--json'];

    const output = await runNxCommand(args);
    const allProjects = JSON.parse(extractJsonFromOutput(output));

    // For each project, assume common test targets exist
    // This is simpler and faster than querying each project individually
    const projectsWithTargets = {};
    for (const project of allProjects) {
      // Assume all projects have these common targets - they'll be filtered later anyway
      projectsWithTargets[project] = ['test', 'test:unit', 'test:e2e', 'test:e2e:ee', 'cypress:run', 'build', 'lint'];
    }

    // Cache the result
    writeFileSync(cachePath, JSON.stringify(projectsWithTargets, null, 2));

    return projectsWithTargets;
  } catch (error) {
    process.stderr.write(`Failed to get affected projects: ${error.message}\n`);

    // Return empty result if everything fails
    return {};
  }
}

async function getAffectedByTarget() {
  const projectsWithTargets = await getAllAffectedProjects();
  const { providers, packages, libs } = await getPackageFolders(['providers', 'packages', 'libs']);

  const results = {
    'test-unit': [],
    'test-e2e': [],
    'test-e2e-ee': [],
    'test-cypress': [],
    'test-providers': [],
    'test-packages': [],
    'test-libs': [],
  };

  // Process each project once
  for (const [project, targets] of Object.entries(projectsWithTargets)) {
    // Check if it's a provider
    if (providers.includes(project)) {
      if (targets.includes('test')) {
        results['test-providers'].push(project);
      }
      continue;
    }

    // Check if it's a package
    if (packages.includes(project)) {
      if (targets.includes('test')) {
        results['test-packages'].push(project);
      }
      continue;
    }

    // Check if it's a lib
    if (libs.includes(project)) {
      if (targets.includes('test')) {
        results['test-libs'].push(project);
      }
      continue;
    }

    // For other projects, check specific test targets
    if (targets.includes('test:unit') || targets.includes('test')) {
      results['test-unit'].push(project);
    }

    if (targets.includes('test:e2e')) {
      results['test-e2e'].push(project);
    }

    if (targets.includes('test:e2e:ee')) {
      results['test-e2e-ee'].push(project);
    }

    if (targets.includes('cypress:run')) {
      results['test-cypress'].push(project);
    }
  }

  return results;
}

// Main execution
async function main() {
  try {
    const results = await getAffectedByTarget();

    // Output results in the format expected by GitHub Actions
    // Using process.stdout.write to avoid any extra formatting from console.log
    process.stdout.write(`test-unit=${JSON.stringify(results['test-unit'])}\n`);
    process.stdout.write(`test-e2e=${JSON.stringify(results['test-e2e'])}\n`);
    process.stdout.write(`test-e2e-ee=${JSON.stringify(results['test-e2e-ee'])}\n`);
    process.stdout.write(`test-cypress=${JSON.stringify(results['test-cypress'])}\n`);
    process.stdout.write(`test-providers=${JSON.stringify(results['test-providers'])}\n`);
    process.stdout.write(`test-packages=${JSON.stringify(results['test-packages'])}\n`);
    process.stdout.write(`test-libs=${JSON.stringify(results['test-libs'])}\n`);
  } catch (error) {
    process.stderr.write(`Error: ${error.message || error}\n`);
    process.exit(1);
  }
}

main();
