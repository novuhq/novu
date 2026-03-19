import * as fs from 'fs';
import * as path from 'path';
import { NovuConfig, validateConfig } from './schema';

export async function loadConfig(configPath?: string): Promise<NovuConfig | null> {
  const cwd = process.cwd();

  const possiblePaths = configPath ? [path.resolve(cwd, configPath)] : await findConfigPaths(cwd);

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const config = await loadConfigFile(filePath);

        return validateConfig(config);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Config file: ${filePath}\n${errorMessage}`);
      }
    }
  }

  return null;
}

async function findConfigPaths(startDir: string): Promise<string[]> {
  const configNames = ['novu.config.ts', 'novu.config.js', 'novu.config.mjs', 'novu.config.cjs'];
  const paths: string[] = [];

  let currentDir = startDir;
  let depth = 0;
  const maxDepth = 3;

  while (depth <= maxDepth) {
    for (const name of configNames) {
      paths.push(path.join(currentDir, name));
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
    depth++;
  }

  return paths;
}

async function loadConfigFile(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath);

  if (ext === '.ts') {
    return await loadTypeScriptConfig(filePath);
  }

  delete require.cache[require.resolve(filePath)];

  const module = require(filePath) as { default?: unknown };

  return module.default || module;
}

async function loadTypeScriptConfig(filePath: string): Promise<unknown> {
  const esbuild = require('esbuild');

  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    external: ['esbuild'],
    logLevel: 'silent',
  });

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error('esbuild produced no output for config file');
  }

  const code = result.outputFiles[0].text;
  const tempModule: { exports: { default?: unknown; [key: string]: unknown } } = {
    exports: {},
  };
  const func = new Function('module', 'exports', 'require', code);
  func(tempModule, tempModule.exports, require);

  return tempModule.exports.default || tempModule.exports;
}
