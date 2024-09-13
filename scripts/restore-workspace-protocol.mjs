import fs from 'fs-extra';
import path from 'node:path';
import { glob } from 'glob';
import { execa } from 'execa';

// The following node packages don't belong to the monorepo and must always be references with specific semver.
const IGNORE_LIST = new Set(['@novu/ntfr-client', '@novu/floating-vue']);

// WIP: Find all package names in the workspace dynamically and eliminate the need for the IGNORE_LIST
async function getPackageNames() {
  const { stdout } = await execa`pnpm nx show projects`;
  return stdout;
}

// Function to update versions of @novu dependencies
function updateNovuDependencies(dependencies) {
  for (const [key] of Object.entries(dependencies || {})) {
    if (key.startsWith('@novu/') && IGNORE_LIST.has(key)) {
      dependencies[key] = 'workspace:*';
    }
  }
}

function processPackageJson(filePath) {
  const packageJson = fs.readJsonSync(filePath);

  updateNovuDependencies(packageJson.dependencies);
  updateNovuDependencies(packageJson.devDependencies);
  updateNovuDependencies(packageJson.peerDependencies);
  updateNovuDependencies(packageJson.optionalDependencies);

  fs.writeJsonSync(filePath, packageJson, { spaces: 2 });
  console.log(`Restored workspace protocol at ${filePath}`);
}

// Find all package.json files in the repo
const files = await glob('packages/**/package.json', { ignore: 'packages/**/node_modules/**' });

files.forEach((file) => processPackageJson(path.resolve(file)));
