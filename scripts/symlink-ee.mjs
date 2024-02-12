import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
