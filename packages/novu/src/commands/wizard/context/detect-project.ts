import fs from 'node:fs';
import path from 'node:path';
import { ProjectContext, ProjectFramework } from '../types';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function detectProject(cwd: string = process.cwd()): ProjectContext {
  const packageJsonPath = locatePackageJson(cwd);
  const pkg = packageJsonPath ? readPackageJson(packageJsonPath) : null;
  const allDeps = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };

  return {
    cwd,
    packageJsonPath,
    framework: detectFramework(cwd, allDeps),
    packageManager: detectPackageManager(cwd),
    hasTypeScript: hasTypeScript(cwd, allDeps),
    installedNovuPackages: Object.keys(allDeps).filter((dep) => dep.startsWith('@novu/') || dep === 'novu'),
    ...detectFrameworkRoute(cwd),
  };
}

function locatePackageJson(cwd: string): string | null {
  const candidate = path.join(cwd, 'package.json');

  return fs.existsSync(candidate) ? candidate : null;
}

function readPackageJson(packageJsonPath: string): PackageJson | null {
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

function detectFramework(cwd: string, deps: Record<string, string>): ProjectFramework {
  if ('next' in deps) {
    if (fs.existsSync(path.join(cwd, 'app')) || fs.existsSync(path.join(cwd, 'src/app'))) {
      return 'nextjs-app';
    }

    return 'nextjs-pages';
  }

  if ('@remix-run/react' in deps || '@remix-run/node' in deps) {
    return 'remix';
  }

  if (
    'react' in deps &&
    ('vite' in deps ||
      fs.existsSync(path.join(cwd, 'vite.config.ts')) ||
      fs.existsSync(path.join(cwd, 'vite.config.js')))
  ) {
    return 'react-vite';
  }

  return 'react';
}

function detectPackageManager(cwd: string): ProjectContext['packageManager'] {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';

  return 'npm';
}

function hasTypeScript(cwd: string, deps: Record<string, string>): boolean {
  if ('typescript' in deps) return true;

  return fs.existsSync(path.join(cwd, 'tsconfig.json'));
}

function detectFrameworkRoute(cwd: string): Pick<ProjectContext, 'hasFrameworkRoute' | 'frameworkRoutePath'> {
  const candidates = [
    'app/api/novu/route.ts',
    'app/api/novu/route.js',
    'src/app/api/novu/route.ts',
    'src/app/api/novu/route.js',
    'pages/api/novu.ts',
    'pages/api/novu.js',
  ];

  for (const candidate of candidates) {
    const candidatePath = path.join(cwd, candidate);
    if (fs.existsSync(candidatePath)) {
      return { hasFrameworkRoute: true, frameworkRoutePath: candidate };
    }
  }

  return { hasFrameworkRoute: false, frameworkRoutePath: null };
}
