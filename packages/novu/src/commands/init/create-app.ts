import { green, cyan } from 'picocolors';
import fs from 'fs';
import path from 'path';
import type { RepoInfo } from './helpers/examples';
import { tryGitInit } from './helpers/git';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { getOnline } from './helpers/is-online';
import { isWriteable } from './helpers/is-writeable';
import type { PackageManager } from './helpers/get-pkg-manager';

import type { TemplateMode, TemplateType } from './templates';
import { installTemplate } from './templates';

export class DownloadError extends Error {}

export async function createApp({
  appPath,
  packageManager,
  typescript,
  eslint,
  srcDir,
  importAlias,
  secretKey,
}: {
  appPath: string;
  packageManager: PackageManager;
  typescript: boolean;
  eslint: boolean;
  srcDir: boolean;
  importAlias: string;
  secretKey: string;
}): Promise<void> {
  let repoInfo: RepoInfo | undefined;
  const mode: TemplateMode = typescript ? 'ts' : 'js';
  const template: TemplateType = 'app-react-email';

  const root = path.resolve(appPath);

  if (!(await isWriteable(path.dirname(root)))) {
    console.error('The application path is not writable, please check folder permissions and try again.');
    console.error('It is likely you do not have write permissions for this folder.');
    process.exit(1);
  }

  const appName = path.basename(root);

  fs.mkdirSync(root, { recursive: true });
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log(`Creating a new Novu app in ${green(root)}.`);
  console.log();

  process.chdir(root);

  /**
   * If an example repository is not provided for cloning, proceed
   * by installing from a template.
   */
  await installTemplate({
    appName,
    root,
    template,
    mode,
    packageManager,
    isOnline,
    eslint,
    srcDir,
    importAlias,
    secretKey,
  });

  if (tryGitInit(root)) {
    console.log('Initialized a git repository.');
    console.log();
  }

  let cdPath: string;
  if (path.join(originalDirectory, appName) === appPath) {
    cdPath = appName;
  } else {
    cdPath = appPath;
  }

  console.log(`${green('Success!')} Created ${appName} at ${appPath}`);
}
