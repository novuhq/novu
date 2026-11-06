import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Get the current directory
const currentDir = process.cwd();

// Remove the prefix up to and including "enterprise/packages/"
const relativePath = currentDir.split('enterprise/packages/')[1];

// Count the number of slashes in the relative path to determine the depth
const depth = (relativePath.match(/\//g) || []).length;

// Generate the correct number of "../" for the symlink command
const prefix = '../'.repeat(depth + 3);

// Generate the symlink command
const symlinkCommand = `ln -sf ${prefix}.source/${relativePath}/src`;

// Execute the symlink command
execSync(symlinkCommand);

console.log(`Symlinked src for ${process.env.PNPM_PACKAGE_NAME} to ${prefix}.source/${relativePath}/src`);

// Node resolves imports from a file's real path, which for these sources is inside .source, so without this link
// their packages come from pnpm's hoisted fallback instead of this package's node_modules.
const sourceDir = path.resolve(currentDir, prefix, '.source', relativePath);
const sourceNodeModules = path.join(sourceDir, 'node_modules');

if (fs.lstatSync(sourceNodeModules, { throwIfNoEntry: false })?.isSymbolicLink()) {
  fs.unlinkSync(sourceNodeModules);
}

if (!fs.existsSync(sourceNodeModules)) {
  fs.symlinkSync(path.relative(fs.realpathSync(sourceDir), path.join(currentDir, 'node_modules')), sourceNodeModules);
  console.log(`Linked node_modules for ${process.env.PNPM_PACKAGE_NAME} into .source/${relativePath}`);
}
