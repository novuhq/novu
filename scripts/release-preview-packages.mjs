/**
 * This script publishs a preview package via https://pkg.pr.new/ for all affected packages between
 * the base branch of the repoand the current HEAD.
 *
 */

import { execa } from 'execa';

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
  const { stdout } = await execa`pnpm nx show projects --affected --base=next --head=HEAD --json`;
  const packageNamesArray = JSON.parse(removeQuotedLines(stdout));
  return new Set(packageNamesArray);
}

// Get all packages names and paths in the monorepo
async function getPackages() {
  const { stdout } = await execa`pnpm list -r --depth -1 --json`;
  return JSON.parse(stdout);
}

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
    // Pnpm list returms absolute paths are absolute. Keep only the "./packages/{{package_folder}}" path
    const relativePath = pkg.path.match(/\/packages.*/)[0];
    memo.push(`'.${relativePath}'`);
  }

  return memo;
}, []);

const { stdout } = await execa`pnpx pkg-pr-new publish ${affectedPackagePaths.join(' ')}`;
console.log(stdout);
