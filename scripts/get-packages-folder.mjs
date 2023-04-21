import { parsePackageSelector, readProjects } from '@pnpm/filter-workspace-packages';


(async () => {
  const path = process.cwd();
  const content = await readProjects(path, [{
    parentDir: 'providers'
  }]);

  const providers = content.allProjects.filter((project) => {
    const contains =  project.dir.includes('providers/');

    return contains;
  } ).map((project) => project.manifest.name);

  return providers;
})()
