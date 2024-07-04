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
  .description(
    `Create a new Novu app

  Using PNPM
  (e.g., create-novu-app --use-pnpm)

  Specifying the secret key:
  (e.g., create-novu-app -s NOVU_SECRET_KEY)`
  )
  .arguments('<project-directory>')
  .usage(`${green('<project-directory>')} [-s <secret-key>] [options]`)
  .action((name) => {
    projectPath = name;
  })
  .option(
    '-s, --secret-key <secret-key>',
    `Your Novu development environment secret key. Note that your novu app won't work outside of local mode without it.`
  )
  .option('--use-npm', `Explicitly tell the CLI to bootstrap the application using npm`)
  .option('--use-pnpm', `Explicitly tell the CLI to bootstrap the application using pnpm`)
  .option('--use-yarn', `Explicitly tell the CLI to bootstrap the application using Yarn`)
  .option('--use-bun', `Explicitly tell the CLI to bootstrap the application using Bun`)
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

  // if no secret key is supplied set to empty string
  if (!program.secretKey) {
    program.secretKey = '';
  }

  /**
   * Verify the project dir is empty or doesn't exist
   */
  const root = path.resolve(resolvedProjectPath);
  const appName = path.basename(root);
  const folderExists = fs.existsSync(root);

  if (folderExists && !isFolderEmpty(root, appName)) {
    console.error("The supplied project directory isn't empty, please provide an empty or non existing directory.");
    process.exit(1);
  }

  const preferences = (conf.get('preferences') || {}) as Record<string, boolean | string>;
  /**
   * If the user does not provide the necessary flags, prompt them for whether
   * to use TS or JS.
   */
  const defaults: typeof preferences = {
    typescript: true,
    eslint: true,
    app: true,
    srcDir: false,
    importAlias: '@/*',
    customizeImportAlias: false,
  };
  const getPrefOrDefault = (field: string) => preferences[field] ?? defaults[field];

  program.typescript = getPrefOrDefault('typescript');

  if (!process.argv.includes('--eslint') && !process.argv.includes('--no-eslint')) {
    program.eslint = getPrefOrDefault('eslint');
  }

  if (ciInfo.isCI) {
    program.tailwind = getPrefOrDefault('tailwind');
  }

  program.srcDir = getPrefOrDefault('srcDir');

  program.app = getPrefOrDefault('app');
  program.importAlias = defaults.importAlias;

  await createApp({
    appPath: resolvedProjectPath,
    packageManager,
    typescript: program.typescript,
    eslint: program.eslint,
    srcDir: program.srcDir,
    importAlias: program.importAlias,
    secretKey: program.secretKey,
  });

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
