import { Sema } from 'async-sema';
import { async as glob } from 'fast-glob';
import { readFileSync } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { bold, cyan } from 'picocolors';
import { copy } from '../helpers/copy';
import { install } from '../helpers/install';

import { GetTemplateFileArgs, InstallTemplateArgs, TemplateTypeEnum } from './types';

function resolveFrameworkVersion(): string {
  const distIndex = __dirname.lastIndexOf(`${path.sep}dist${path.sep}`);
  if (distIndex === -1) return 'latest';

  const pkgRoot = __dirname.slice(0, distIndex);
  try {
    const pkg = JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
    const ver = pkg.dependencies?.['@novu/framework'];
    if (!ver || ver.startsWith('workspace:')) return 'latest';

    return ver;
  } catch {
    return 'latest';
  }
}
/**
 * Get the file path for a given file in a template, e.g. "next.config.js".
 */
export const getTemplateFile = ({ template, mode, file }: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, mode, file);
};

export const SRC_DIR_NAMES = ['app', 'pages', 'styles'];

/**
 * Install a Next.js internal template to a given `root` directory.
 */
export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  mode,
  eslint,
  srcDir,
  importAlias,
  secretKey,
  apiUrl,
  applicationId,
  userId,
  agentIdentifier,
}: InstallTemplateArgs) => {
  console.log(bold(`Using ${packageManager}.`));

  /**
   * Copy the template files to the target directory.
   */
  console.log('\nInitializing project with template:', template, '\n');
  const templatePath = path.join(__dirname, template, mode);
  const copySource = ['**'];
  if (!eslint) copySource.push('!eslintrc.json');
  if (!template.includes('react')) {
    copySource.push(mode === 'ts' ? 'tailwind.config.ts' : '!tailwind.config.js', '!postcss.config.cjs');
  }

  await copy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename(name) {
      switch (name) {
        case 'gitignore':
        case 'eslintrc.json': {
          return `.${name}`;
        }
        /*
         * README.md is ignored by webpack-asset-relocator-loader used by ncc:
         * https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
         */
        case 'README-template.md': {
          return 'README.md';
        }
        default: {
          return name;
        }
      }
    },
  });

  if (template === TemplateTypeEnum.APP_AGENT && agentIdentifier) {
    if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(agentIdentifier)) {
      throw new Error(
        `Invalid agent identifier: "${agentIdentifier}". Must be a lowercase slug (a-z, 0-9, hyphens, underscores).`
      );
    }
    const agentFile = path.join(root, 'app', 'novu', 'agents', 'support-agent.tsx');
    await fs.writeFile(
      agentFile,
      (await fs.readFile(agentFile, 'utf8')).replace("agent('support-agent',", `agent('${agentIdentifier}',`)
    );
  }

  const tsconfigFile = path.join(root, 'tsconfig.json');
  await fs.writeFile(
    tsconfigFile,
    (await fs.readFile(tsconfigFile, 'utf8'))
      .replace(`"@/*": ["./*"]`, srcDir ? `"@/*": ["./src/*"]` : `"@/*": ["./*"]`)
      .replace(`"@/*":`, `"${importAlias}":`)
  );

  // update import alias in any files if not using the default
  if (importAlias !== '@/*') {
    const files = await glob('**/*', {
      cwd: root,
      dot: true,
      stats: false,
      /*
       * We don't want to modify compiler options in [ts/js]config.json
       * and none of the files in the .git folder
       */
      ignore: ['tsconfig.json', 'jsconfig.json', '.git/**/*'],
    });
    const writeSema = new Sema(8, { capacity: files.length });
    await Promise.all(
      files.map(async (file) => {
        await writeSema.acquire();
        const filePath = path.join(root, file);
        if ((await fs.stat(filePath)).isFile()) {
          await fs.writeFile(
            filePath,
            (await fs.readFile(filePath, 'utf8')).replace(`@/`, `${importAlias.replace(/\*/g, '')}`)
          );
        }
        writeSema.release();
      })
    );
  }

  if (srcDir) {
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    await Promise.all(
      SRC_DIR_NAMES.map(async (file) => {
        await fs.rename(path.join(root, file), path.join(root, 'src', file)).catch((err) => {
          if (err.code !== 'ENOENT') {
            throw err;
          }
        });
      })
    );

    const isAppTemplate = template.startsWith('app');

    // Change the `Get started by editing pages/index` / `app/page` to include `src`
    const indexPageFile = path.join(
      'src',
      isAppTemplate ? 'app' : 'pages',
      `${isAppTemplate ? 'page' : 'index'}.${mode === 'ts' ? 'tsx' : 'js'}`
    );

    await fs.writeFile(
      indexPageFile,
      (await fs.readFile(indexPageFile, 'utf8')).replace(
        isAppTemplate ? 'app/page' : 'pages/index',
        isAppTemplate ? 'src/app/page' : 'src/pages/index'
      )
    );

    if (template === TemplateTypeEnum.APP_REACT_EMAIL) {
      const tailwindConfigFile = path.join(root, mode === 'ts' ? 'tailwind.config.ts' : 'tailwind.config.js');
      await fs.writeFile(
        tailwindConfigFile,
        (await fs.readFile(tailwindConfigFile, 'utf8')).replace(
          /\.\/(\w+)\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/g,
          './src/$1/**/*.{js,ts,jsx,tsx,mdx}'
        )
      );
    }
  }

  /* write .env file */
  const envVars =
    template === TemplateTypeEnum.APP_AGENT
      ? { NOVU_SECRET_KEY: secretKey, NOVU_API_URL: apiUrl ?? 'https://api.novu.co' }
      : {
          NOVU_SECRET_KEY: secretKey,
          NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER: applicationId ?? '',
          NEXT_PUBLIC_NOVU_SUBSCRIBER_ID: userId ?? '',
        };

  const val = Object.entries(envVars).reduce((acc, [key, value]) => {
    return `${acc}${key}=${value}${os.EOL}`;
  }, '');

  await fs.writeFile(path.join(root, '.env.local'), val);

  /* write github action (skip for agent template) */
  if (template !== TemplateTypeEnum.APP_AGENT) {
    await copy(copySource, `${root}/.github`, {
      parents: true,
      cwd: path.join(__dirname, `./github`),
    });
  }

  /** Copy the version from package.json or override for tests. */
  const version = '16.2.1';

  /** Create a package.json for the new project and write it to disk. */
  const isAgentTemplate = template === TemplateTypeEnum.APP_AGENT;

  const baseDependencies: Record<string, string> = {
    react: '^19',
    'react-dom': '^19',
    next: version,
    '@novu/framework': resolveFrameworkVersion(),
  };

  if (!isAgentTemplate) {
    baseDependencies['@novu/nextjs'] = '^2.5.0';
  }

  const packageJson: any = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: `next dev --port=4000`,
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: baseDependencies,
    devDependencies: {},
  };

  if (mode === 'ts') {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: '^5',
      '@types/node': '^22',
      '@types/react': '^19',
      '@types/react-dom': '^19',
    };
  }

  if (template === TemplateTypeEnum.APP_REACT_EMAIL) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      postcss: '^8',
      tailwindcss: '^3.4.1',
    };

    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@react-email/components': '0.0.18',
      '@react-email/tailwind': '0.0.18',
    };
  }

  if (template === TemplateTypeEnum.APP_REACT_EMAIL || isAgentTemplate) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      zod: '^3.23.8',
      'zod-to-json-schema': '^3.23.1',
    };
  }

  /* Default ESLint dependencies. */
  if (eslint) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      eslint: '^9',
      'eslint-config-next': version,
    };
  }

  const devDeps = Object.keys(packageJson.devDependencies).length;
  if (!devDeps) delete packageJson.devDependencies;

  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2) + os.EOL);

  console.log('\nInstalling dependencies:');
  for (const dependency in packageJson.dependencies) console.log(`- ${cyan(dependency)}`);

  if (devDeps) {
    console.log('\nInstalling devDependencies:');
    for (const dependency in packageJson.devDependencies) console.log(`- ${cyan(dependency)}`);
  }

  console.log();

  await install(packageManager, isOnline);
};

export * from './types';
