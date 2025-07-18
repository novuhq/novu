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
    };

    const nxProcess = spawn('pnpm', ['nx', ...args], processOptions);
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
        reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });
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

  // Get the full project graph with all metadata in a single call
  const graphArgs = IS_ALL
    ? ['graph', '--affected', '--files', 'package.json', '--file=output.json']
    : ['graph', '--affected', '--base', BASE_BRANCH_NAME, '--file=output.json'];

  try {
    await runNxCommand(graphArgs);

    // Read the generated graph file
    const graphPath = path.join(ROOT_PATH, 'output.json');
    const graphData = JSON.parse(readFileSync(graphPath, 'utf8'));

    // Extract project targets from the graph
    const projectsWithTargets = {};
    const affectedProjects = Object.keys(graphData.graph.nodes || {});

    for (const project of affectedProjects) {
      const node = graphData.graph.nodes[project];
      if (node && node.data) {
        projectsWithTargets[project] = Object.keys(node.data.targets || {});
      } else {
        projectsWithTargets[project] = [];
      }
    }

    // Clean up the output file
    if (existsSync(graphPath)) {
      fs.unlinkSync(graphPath);
    }

    // Cache the result
    writeFileSync(cachePath, JSON.stringify(projectsWithTargets, null, 2));

    return projectsWithTargets;
  } catch (error) {
    console.error('Failed to generate project graph, falling back to individual queries:', error);

    // Fallback to the original approach if graph generation fails
    const args = IS_ALL
      ? ['show', 'projects', '--affected', '--files', 'package.json', '--json']
      : ['show', 'projects', '--affected', '--base', BASE_BRANCH_NAME, '--json'];

    const output = await runNxCommand(args);
    const allProjects = JSON.parse(extractJsonFromOutput(output));

    const projectsWithTargets = {};
    for (const project of allProjects) {
      projectsWithTargets[project] = [];
    }

    return projectsWithTargets;
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
