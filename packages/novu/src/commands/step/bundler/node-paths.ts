import * as fs from 'fs';
import * as path from 'path';

export function getCliNodeModulesPaths(): string[] {
  const paths: string[] = [];
  let dir = __dirname;

  while (true) {
    const nodeModules = path.join(dir, 'node_modules');
    if (fs.existsSync(nodeModules)) {
      paths.push(nodeModules);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return paths;
}
