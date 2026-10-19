import fs from 'fs';
import path from 'path';

/**
 * Utility functions for React version detection and compatibility checks
 */

/**
 * Gets the React version from the project's dependencies
 * @returns {string} The React version (e.g., '16.14.0', '17.0.2', '18.0.0')
 */
export function getReactVersion(): string {
  try {
    // First try to get React version from current project's package.json
    const projectPackageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(projectPackageJsonPath)) {
      const projectPackageJson = JSON.parse(fs.readFileSync(projectPackageJsonPath, 'utf-8'));
      const reactVersion = projectPackageJson.dependencies?.react || projectPackageJson.devDependencies?.react;
      if (reactVersion) {
        return reactVersion.replace(/[^0-9.]/g, '');
      }
    }

    // Fallback to installed React package
    try {
      const reactPackageJsonPath = require.resolve('react/package.json', { paths: [process.cwd()] });
      const packageJson = JSON.parse(fs.readFileSync(reactPackageJsonPath, 'utf-8'));

      return packageJson.version;
    } catch {
      throw new Error('React package not found');
    }
  } catch (error) {
    console.warn('Could not detect React version, assuming 18.0.0');

    return '18.0.0';
  }
}

/**
 * Checks if the React version is modern (17 or higher)
 * @returns {boolean} True if React version is 17 or higher
 */
export function isModernReact(): boolean {
  const version = getReactVersion();
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    return false;
  }
  const majorVersion = parseInt(version.split('.')[0], 10);

  return majorVersion >= 17;
}

/**
 * Checks if the React version is legacy (16.x)
 * @returns {boolean} True if React version is 16.x
 */
export function isLegacyReact(): boolean {
  const version = getReactVersion();
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    return false;
  }
  const majorVersion = parseInt(version.split('.')[0], 10);

  return majorVersion === 16;
}

/**
 * Detects if the project is a Next.js project by checking dependencies
 * @returns {boolean} True if Next.js is a dependency
 */
export function isNextJsProject(): boolean {
  try {
    const projectPackageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(projectPackageJsonPath)) {
      const projectPackageJson = JSON.parse(fs.readFileSync(projectPackageJsonPath, 'utf-8'));
      const dependencies = {
        ...projectPackageJson.dependencies,
        ...projectPackageJson.devDependencies,
      };

      return Boolean(dependencies.next);
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Gets the appropriate environment variable name based on framework
 * @returns {string} The environment variable name to use
 */
export function getEnvironmentVariableName(): string {
  if (isNextJsProject()) {
    return 'NEXT_PUBLIC_NOVU_APP_ID';
  }

  return 'NOVU_APP_ID';
}
