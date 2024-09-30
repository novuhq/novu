/**
 * This script publishes a preview package via https://pkg.pr.new/ for all affected packages between
 * the base branch and the current HEAD.
 *
 */

import { execa } from 'execa';
import { exec } from 'node:child_process';

// Remove quoted lines from the nx show projects command
function removeQuotedLines(input) {
  // Split the input into an array of lines
  let lines = input.split('\n');

  // Filter out lines that start with the '>' symbol
  let filteredLines = lines.filter((line) => !line.trim().startsWith('>'));

  // Join the filtered lines back into a single string
  return filteredLines.join('\n');
}

// Get all affected package names in the monorepo as a set
async function getPackageNames() {
  const { stdout } = await execa`pnpm nx show projects --affected --base=origin/next --head=HEAD --json`;
  const packageNamesArray = JSON.parse(removeQuotedLines(stdout));
  return new Set(packageNamesArray);
}

// Get all packages names and paths in the monorepo
async function getPackages() {
  const { stdout } = await execa`pnpm list -r --depth -1 --json`;
  return JSON.parse(stdout);
}

// Function to execute a shell command and return it as a Promise instead of using execa.
// Execa does not work well with the necessary quotes of the publish command due to its internal escaping capabilities.
// See https://github.com/sindresorhus/execa/blob/main/docs/escaping.md
async function myExec(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
        return;
      }
      resolve(stdout); // Resolve with the command output
    });
  });
}

try {
  const affectedPackageNames = await getPackageNames();

  const novuPackages = await getPackages();

  // Get the paths of the affected packages
  const affectedPackagePaths = novuPackages.reduce((memo, pkg) => {
    // Ignore packages that are marked as private
    if (pkg.private) {
      return memo;
    }

    // Ignore packages that are not in the "packages" folder
    if (!pkg.path.includes('packages')) {
      return memo;
    }

    // Preview only affected public packages
    if (affectedPackageNames.has(pkg.name)) {
      // Pnpm list returns absolute paths are absolute. Keep only the "./packages/{{package_folder}}" path
      const relativePath = pkg.path.match(/\/packages.*/)[0];
      memo.push(`'.${relativePath}'`);
    }

    return memo;
  }, []);

  if (affectedPackagePaths.length === 0) {
    process.exit(0);
  }

  const command = `pnpx pkg-pr-new publish ${affectedPackagePaths.join(' ')}`;
  console.log(await myExec(command));
} catch (err) {
  console.error(`Error: ${err.message || err}`);
  process.exit(1);
}
