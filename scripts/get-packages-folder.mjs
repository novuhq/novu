import fs from 'node:fs';
import { readProjects } from '@pnpm/filter-workspace-packages';

export async function getPackageFolders(folders) {
  const cachePath = folders.join('_') + '-changes-cache.json';

  const isCacheExists = fs.existsSync(cachePath);
  if (isCacheExists) {
    const cache = fs.readFileSync(cachePath, 'utf8');

    return JSON.parse(cache);
  }

  const path = process.cwd();
  const content = await readProjects(path, {
    engineStrict: false,
  });

  const result = {};
  for (const folder of folders) {
    const filteredItems = content.allProjects
      .filter((project) => {
        const contains = project.dir.includes(folder + '/');

        // enterprise/packages/* need the private .source submodule, which only the backend services job checks out.
        return contains && !project.manifest.name.startsWith('@novu/ee-');
      })
      .map((project) => project.manifest.name);

    result[folder] = filteredItems;
  }

  // store results in cache file for later use
  fs.writeFileSync(cachePath, JSON.stringify(result));

  return result;
}
