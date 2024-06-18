#!/usr/bin/env node
/* eslint-disable */
import { cyan, green, red, yellow, bold, blue } from 'picocolors';
import Commander from 'commander';
import Conf from 'conf';
import path from 'path';
import prompts from 'prompts';
import type { InitialReturnValue } from 'prompts';
import checkForUpdate from 'update-check';
import { createApp, DownloadError } from './create-app';
import { getPkgManager } from './helpers/get-pkg-manager';
import { validateNpmName } from './helpers/validate-pkg';
import packageJson from './package.json';
import ciInfo from 'ci-info';
import { isFolderEmpty } from './helpers/is-folder-empty';
import fs from 'fs';

let projectPath = '';

const handleSigTerm = () => process.exit(0);

const defaultTunnelHost = 'https://localtunnel.me';

process.on('SIGINT', handleSigTerm);
process.on('SIGTERM', handleSigTerm);

const onPromptState = (state: { value: InitialReturnValue; aborted: boolean; exited: boolean }) => {
  if (state.aborted) {
    /*
     * If we don't re-enable the terminal cursor before exiting
     * the program, the cursor will remain hidden
     */
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\n');
    process.exit(1);
  }
};

const program = new Commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('<project-directory>')
  .usage(`${green('<project-directory>')} [options]`)
  .action((name) => {
    projectPath = name;
  })
  .option(
    '-k, --api-key [apiKey]',
    `

  Your Novu Development environment apiKey. Note that your novu app won't
  work with a non development environment apiKey.
`
  )
  .option(
    '-t, --tunnel-host',
    `

  Set's the tunnel host url that will be used to request local tunnels,
  defaults to ${defaultTunnelHost}
`
  )
  .option(
    '--ts, --typescript',
    `

  Initialize as a TypeScript project. (default)
`
  )
  .option(
    '--react-email',
    `

  Initialize with React Email config. (default)
`
  )
  .option(
    '--src-dir',
    `

  Initialize inside a \`src/\` directory.
`
  )
  .option(
    '--use-npm',
    `

  Explicitly tell the CLI to bootstrap the application using npm
`
  )
  .option(
    '--use-pnpm',
    `

  Explicitly tell the CLI to bootstrap the application using pnpm
`
  )
  .option(
    '--use-yarn',
    `

  Explicitly tell the CLI to bootstrap the application using Yarn
`
  )
  .option(
    '--use-bun',
    `

  Explicitly tell the CLI to bootstrap the application using Bun
`
  )
  .allowUnknownOption()
  .parse(process.argv);

const packageManager = !!program.useNpm
  ? 'npm'
  : !!program.usePnpm
  ? 'pnpm'
  : !!program.useYarn
  ? 'yarn'
  : !!program.useBun
  ? 'bun'
  : getPkgManager();

async function run(): Promise<void> {
  const conf = new Conf({ projectName: 'create-novu-app' });

  if (program.resetPreferences) {
    conf.clear();
    console.log(`Preferences reset successfully`);

    return;
  }

  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const res = await prompts({
      onState: onPromptState,
      type: 'text',
      name: 'path',
      message: 'What is your project named?',
      initial: 'my-novu-app',
      validate: (name) => {
        const validation = validateNpmName(path.basename(path.resolve(name)));
        if (validation.valid) {
          return true;
        }

        return 'Invalid project name: ' + validation.problems[0];
      },
    });

    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${cyan(program.name())} ${green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${cyan(program.name())} ${green('my-novu-app')}\n\n` +
        `Run ${cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const projectName = path.basename(resolvedProjectPath);

  const validation = validateNpmName(projectName);
  if (!validation.valid) {
    console.error(`Could not create a project called ${red(`"${projectName}"`)} because of npm naming restrictions:`);

    validation.problems.forEach((p) => console.error(`    ${red(bold('*'))} ${p}`));
    process.exit(1);
  }

  if (program.example === true) {
    console.error('Please provide an example name or url, otherwise remove the example option.');
    process.exit(1);
  }

  if (program.apiKey === true || !program.apiKey) {
    console.error('Please provide a valid apiKey value.');
    process.exit(1);
  }

  /**
   * Verify the project dir is empty or doesn't exist
   */
  const root = path.resolve(resolvedProjectPath);
  const appName = path.basename(root);
  const folderExists = fs.existsSync(root);

  if (folderExists && !isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const example = typeof program.example === 'string' && program.example.trim();
  const preferences = (conf.get('preferences') || {}) as Record<string, boolean | string>;
  /**
   * If the user does not provide the necessary flags, prompt them for whether
   * to use TS or JS.
   */
  if (!example) {
    const defaults: typeof preferences = {
      typescript: true,
      eslint: true,
      reactEmail: true,
      app: true,
      srcDir: false,
      importAlias: '@/*',
      customizeImportAlias: false,
    };
    const getPrefOrDefault = (field: string) => preferences[field] ?? defaults[field];

    if (!program.typescript && !program.javascript) {
      /*
       * default to TypeScript in CI as we can't prompt to
       * prevent breaking setup flows
       */
      program.typescript = getPrefOrDefault('typescript');
    }

    if (!process.argv.includes('--eslint') && !process.argv.includes('--no-eslint')) {
      program.eslint = getPrefOrDefault('eslint');
    }

    if (!process.argv.includes('--react-email') && !process.argv.includes('--no-react-email')) {
      if (ciInfo.isCI) {
        program.tailwind = getPrefOrDefault('tailwind');
      } else {
        const tw = blue('React E-mail');
        const { reactEmail } = await prompts({
          onState: onPromptState,
          type: 'toggle',
          name: 'reactEmail',
          message: `Would you like to use ${tw}?`,
          initial: getPrefOrDefault('reactEmail'),
          active: 'Yes',
          inactive: 'No',
        });
        program.reactEmail = Boolean(reactEmail);
        preferences.reactEmail = Boolean(reactEmail);
      }
    }

    if (!process.argv.includes('--src-dir') && !process.argv.includes('--no-src-dir')) {
      program.srcDir = getPrefOrDefault('srcDir');
    }

    if (!process.argv.includes('--app') && !process.argv.includes('--no-app')) {
      program.app = getPrefOrDefault('app');
    }

    if (typeof program.importAlias !== 'string' || !program.importAlias.length) {
      // We don't use preferences here because the default value is @/* regardless of existing preferences
      program.importAlias = defaults.importAlias;
    }
  }

  try {
    await createApp({
      appPath: resolvedProjectPath,
      packageManager,
      example: example && example !== 'default' ? example : undefined,
      examplePath: program.examplePath,
      typescript: program.typescript,
      reactEmail: program.reactEmail,
      eslint: program.eslint,
      srcDir: program.srcDir,
      importAlias: program.importAlias,
      apiKey: program.apiKey,
      tunnelHost: program.tunnelHost ? program.tunnelHost : defaultTunnelHost,
    });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }

    const res = await prompts({
      onState: onPromptState,
      type: 'confirm',
      name: 'builtin',
      message:
        `Could not download "${example}" because of a connectivity issue between your machine and GitHub.\n` +
        `Do you want to use the default template instead?`,
      initial: true,
    });
    if (!res.builtin) {
      throw reason;
    }

    await createApp({
      appPath: resolvedProjectPath,
      packageManager,
      typescript: program.typescript,
      eslint: program.eslint,
      reactEmail: program.reactEmail,
      srcDir: program.srcDir,
      importAlias: program.importAlias,
      apiKey: program.apiKey,
      tunnelHost: program.tunnelHost ? program.tunnelHost : defaultTunnelHost,
    });
  }
  conf.set('preferences', preferences);
}

const update = checkForUpdate(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    const res = await update;
    if (res?.latest) {
      const updateMessage =
        packageManager === 'yarn'
          ? 'yarn global add create-novu-app'
          : packageManager === 'pnpm'
          ? 'pnpm add -g create-novu-app'
          : packageManager === 'bun'
          ? 'bun add -g create-novu-app'
          : 'npm i -g create-novu-app';

      console.log(
        yellow(bold('A new version of `create-novu-app` is available!')) +
          '\n' +
          'You can update by running: ' +
          cyan(updateMessage) +
          '\n'
      );
    }
    process.exit();
  } catch {
    // ignore error
  }
}

run()
  .then(notifyUpdate)
  .catch(async (reason) => {
    console.log();
    console.log('Aborting installation.');
    if (reason.command) {
      console.log(`  ${cyan(reason.command)} has failed.`);
    } else {
      console.log(red('Unexpected error. Please report it as a bug:') + '\n', reason);
    }
    console.log();

    await notifyUpdate();

    process.exit(1);
  });
