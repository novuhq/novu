import { cyan, green, red, bold } from 'picocolors';
import path from 'path';
import prompts from 'prompts';
import type { InitialReturnValue } from 'prompts';
import fs from 'fs';
import { createApp } from './create-app';
import { validateNpmName } from './helpers/validate-pkg';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { AnalyticService } from '../../services/analytics.service';

const analytics = new AnalyticService();

const programName = 'novu init';

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

export interface IInitCommandOptions {
  secretKey?: string;
  projectPath?: string;
  apiUrl: string;
}

export async function init(program: IInitCommandOptions, anonymousId?: string): Promise<void> {
  if (anonymousId) {
    analytics.track({
      identity: {
        anonymousId,
      },
      data: {},
      event: 'Run Novu Init Command',
    });
  }

  let { projectPath } = program;

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
      validate: (name: string) => {
        const validation = validateNpmName(path.basename(path.resolve(name)));
        if (validation.valid) {
          return true;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return `Invalid project name: ${(validation as any).problems[0]}`;
      },
    });

    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${cyan(programName)} ${green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${cyan(programName)} ${green('my-novu-app')}\n\n` +
        `Run ${cyan(`${programName} --help`)} to see all options.`
    );
    process.exit(1);
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const projectName = path.basename(resolvedProjectPath);

  const validation = validateNpmName(projectName);
  if (!validation.valid) {
    console.error(`Could not create a project called ${red(`"${projectName}"`)} because of npm naming restrictions:`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (validation as any).problems.forEach((problem: string) => console.error(`    ${red(bold('*'))} ${problem}`));
    process.exit(1);
  }

  let userId: string;
  // if no secret key is supplied set to empty string
  if (!program.secretKey) {
    // eslint-disable-next-line no-param-reassign
    program.secretKey = '';
  } else {
    try {
      const response = await fetch(`${program.apiUrl}/v1/users/me`, {
        headers: {
          Authorization: `ApiKey ${program.secretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch api key details');
      }

      const user = await response.json();

      userId = user.data?._id;

      analytics.alias({
        previousId: anonymousId,
        userId,
      });
    } catch (error) {
      console.error(
        // eslint-disable-next-line max-len
        `Failed to verify your secret key against ${program.apiUrl}. For EU instances use --api-url https://eu.novu.co or provide the correct secret key`
      );

      process.exit(1);
    }
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

  const preferences = {} as Record<string, boolean | string>;
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

  if (userId || anonymousId) {
    analytics.track({
      identity: userId ? { userId } : { anonymousId },
      data: {
        name: projectName,
      },
      event: 'Creating a new project',
    });
  }

  await createApp({
    appPath: resolvedProjectPath,
    packageManager: 'npm',
    typescript: defaults.typescript as boolean,
    eslint: defaults.eslint as boolean,
    srcDir: defaults.srcDir as boolean,
    importAlias: defaults.importAlias as string,
    secretKey: program.secretKey,
  });

  if (userId || anonymousId) {
    analytics.track({
      identity: userId ? { userId } : { anonymousId },
      data: {
        name: projectName,
      },
      event: 'Project created',
    });
  }
}
