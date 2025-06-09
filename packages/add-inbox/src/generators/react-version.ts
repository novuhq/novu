/**
 * Utility functions for React version detection and compatibility checks
 */

/**
 * Gets the React version from the project's dependencies
 * @returns {string} The React version (e.g., '16.14.0', '17.0.2', '18.0.0')
 */
export function getReactVersion(): string {
  try {
    const fs = require('fs');
    const path = require('path');

    // First try to get React version from current project's package.json
    const projectPackageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(projectPackageJsonPath)) {
      const projectPackageJson = JSON.parse(fs.readFileSync(projectPackageJsonPath, 'utf-8'));
      const reactVersion = projectPackageJson.dependencies?.react || projectPackageJson.devDependencies?.react;
      if (reactVersion) {
        return reactVersion.replace(/[\^~]/, '');
      }
    }

    // Fallback to installed React package
    try {
      const packageJson = require('react/package.json');
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
  const majorVersion = parseInt(version.split('.')[0], 10);
  return majorVersion >= 17;
}

/**
 * Checks if the React version is legacy (16.x)
 * @returns {boolean} True if React version is 16.x
 */
export function isLegacyReact(): boolean {
  const version = getReactVersion();
  return version.startsWith('16.');
}

/**
 * Gets the appropriate environment variable name based on React version
 * @returns {string} The environment variable name to use
 */
export function getEnvironmentVariableName(): string {
  if (isModernReact()) {
    return 'VITE_NOVU_APP_ID';
  }
  return 'NOVU_APP_ID';
}

module.exports = {
  getReactVersion,
  isModernReact,
  isLegacyReact,
  getEnvironmentVariableName,
};
