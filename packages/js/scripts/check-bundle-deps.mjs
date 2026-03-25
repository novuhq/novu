import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

/**
 * Validates that the @novu/js build output bundles all Solid ecosystem
 * dependencies and does not leak external references that would cause
 * "React is not defined" errors in non-React consumer environments.
 *
 * See: https://github.com/novuhq/novu/issues/10078
 */

const baseDir = process.cwd();

const bundleFiles = [
  path.resolve(baseDir, './dist/esm/ui/index.mjs'),
  path.resolve(baseDir, './dist/cjs/ui/index.js'),
];

// Packages that must be inlined (not left as external imports)
const forbiddenExternalImports = [
  /\bfrom\s+['"]solid-js(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]solid-motionone['"]/,
  /\bfrom\s+['"]solid-floating-ui['"]/,
  /\bfrom\s+['"]@kobalte\/[^'"]+['"]/,
  /\bfrom\s+['"]@solid-primitives\/[^'"]+['"]/,
  /\bfrom\s+['"]@motionone\/[^'"]+['"]/,
  /\brequire\s*\(\s*['"]solid-js(?:\/[^'"]*)?['"]\s*\)/,
  /\brequire\s*\(\s*['"]solid-motionone['"]\s*\)/,
  /\brequire\s*\(\s*['"]solid-floating-ui['"]\s*\)/,
  /\brequire\s*\(\s*['"]@kobalte\/[^'"]+['"]\s*\)/,
  /\brequire\s*\(\s*['"]@solid-primitives\/[^'"]+['"]\s*\)/,
  /\brequire\s*\(\s*['"]@motionone\/[^'"]+['"]\s*\)/,
];

// React should never appear in the bundle
const reactPatterns = [
  /\bfrom\s+['"]react['"]/,
  /\brequire\s*\(\s*['"]react['"]\s*\)/,
  /\bReact\.createElement\b/,
];

const checkBundle = async () => {
  console.log(chalk.gray('Checking bundle for external Solid/React references...\n'));

  let hasFailure = false;

  for (const filePath of bundleFiles) {
    let hasFileFailure = false;
    const fileName = path.relative(baseDir, filePath);
    let content;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      console.log(chalk.red(`  FAIL: ${fileName} not found`));
      hasFailure = true;
      continue;
    }

    // Check for forbidden external imports
    for (const pattern of forbiddenExternalImports) {
      const match = content.match(pattern);
      if (match) {
        console.log(chalk.red(`  FAIL: ${fileName} has external Solid import: ${match[0]}`));
        hasFileFailure = true;
      }
    }

    // Check for React references
    for (const pattern of reactPatterns) {
      const match = content.match(pattern);
      if (match) {
        console.log(chalk.red(`  FAIL: ${fileName} contains React reference: ${match[0]}`));
        hasFileFailure = true;
      }
    }

    // Verify Solid runtime is actually inlined
    if (!content.includes('createSignal') && !content.includes('createEffect')) {
      console.log(chalk.red(`  FAIL: ${fileName} missing inlined Solid runtime`));
      hasFileFailure = true;
    }

    if (hasFileFailure) {
      hasFailure = true;
    } else {
      console.log(chalk.green(`  PASS: ${fileName}`));
    }
  }

  if (hasFailure) {
    console.log(
      chalk.bold.red(
        '\nBundle contains external Solid references or React leaks! ' +
          'This will cause "React is not defined" errors for non-React consumers. ' +
          'See https://github.com/novuhq/novu/issues/10078\n'
      )
    );
    process.exit(1);
  } else {
    console.log(chalk.green('\nBundle dependency check passed.\n'));
  }
};

checkBundle();
