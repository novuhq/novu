import fs from 'fs';
import path from 'path';
import { bold, cyan, green, red } from 'picocolors';
import type { InitialReturnValue } from 'prompts';
import prompts from 'prompts';
import { AnalyticService } from '../../services/analytics.service';
import { createApp } from './create-app';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { validateNpmName } from './helpers/validate-pkg';

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
  template?: string;
  agentIdentifier?: string;
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

    (validation as any).problems.forEach((problem: string) => {
      console.error(`    ${red(bold('*'))} ${problem}`);
    });
    process.exit(1);
  }

  let applicationId: string;
  let userId: string;
  // if no secret key is supplied set to empty string
  if (!program.secretKey) {
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

      const integrationsResponse = await fetch(`${program.apiUrl}/v1/environments/me`, {
        headers: {
          Authorization: `ApiKey ${program.secretKey}`,
        },
      });

      const environment = await integrationsResponse.json();
      applicationId = environment.data.identifier;

      analytics.alias({
        previousId: anonymousId,
        userId,
      });
    } catch (error) {
      console.error(
        `Failed to verify your secret key against ${program.apiUrl}. For EU instances use --api-url https://eu.api.novu.co or provide the correct secret key`
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

  const supportedTemplates = ['notifications', 'agent'] as const;
  let templateChoice = program.template;

  if (templateChoice && !supportedTemplates.includes(templateChoice as (typeof supportedTemplates)[number])) {
    console.error(`Invalid template "${program.template}". Supported templates: ${supportedTemplates.join(', ')}`);
    process.exit(1);
  }

  if (!templateChoice) {
    const res = await prompts({
      onState: onPromptState,
      type: 'select',
      name: 'template',
      message: 'What type of Novu app do you want to create?',
      choices: [
        { title: 'Notifications', value: 'notifications', description: 'Workflows, email templates, and in-app inbox' },
        { title: 'Agent', value: 'agent', description: 'Conversational AI agent with chat platform support' },
      ],
      initial: 0,
    });

    templateChoice = res.template;
  }

  if (!templateChoice) {
    console.error('No template selected.');
    process.exit(1);
  }

  const preferences = {} as Record<string, boolean | string>;
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
    templateChoice,
    typescript: defaults.typescript as boolean,
    eslint: defaults.eslint as boolean,
    srcDir: defaults.srcDir as boolean,
    importAlias: defaults.importAlias as string,
    secretKey: program.secretKey,
    apiUrl: program.apiUrl,
    applicationId,
    userId,
    agentIdentifier: program.agentIdentifier,
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
