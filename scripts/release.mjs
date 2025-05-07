/**
 * Release all packages in the monorepo.
 *
 * Usage: pnpm release <version>
 *
 * Known issues:
 * - nx release with independent versioning and updateDependents: "auto" increases patch by the amount of dependencies updated (https://github.com/nrwl/nx/issues/27823)
 *
 * Alternative options:
 *
 * If the global release script fails for any reason, you can run the following independent NX commands to release the packages individually:
 *
 * pnpm nx release version v3.0.0 --projects=@novu/js,@novu/react,@novu/nextjs,@novu/react-native
 * pnpm nx release changelog v3.0.0 --projects=@novu/js,@novu/react,@novu/nextjs,@novu/react-native
 * pnpm run build:packages
 * pnpm nx release publish --projects=@novu/js,@novu/react,@novu/nextjs,@novu/react-native --otp=123456
 *
 */

import { hideBin } from 'yargs/helpers';
import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release/index.js';
import inquirer from 'inquirer';
import yargs from 'yargs/yargs';
import { execa } from 'execa';

const groups = ['packages'];

(async () => {
  const { dryRun, verbose, from, firstRelease, projects, ...rest } = yargs(hideBin(process.argv))
    .version(false)
    .option('dryRun', {
      alias: 'd',
      description: 'Whether or not to perform a dry-run of the release process, defaults to true',
      type: 'boolean',
      default: true,
    })
    .option('verbose', {
      alias: 'v',
      description: 'Whether or not to enable verbose logging, defaults to false',
      type: 'boolean',
      default: false,
    })
    .option('from', {
      alias: 'f',
      description:
        'The git reference to use as the start of the changelog. If not set it will attempt to resolve the latest tag and use that.',
      type: 'string',
    })
    .option('first-release', {
      alias: 'r',
      description: 'Whether or not this is the first release, defaults to false',
      type: 'boolean',
      default: false,
    })
    .option('projects', {
      alias: 'p',
      description: 'The projects to release, defaults to all',
      type: 'array',
    })
    .help()
    .parse();

  const specifier = rest._[0];

  if (!specifier) {
    console.error('Missing version! Usage: pnpm release <version>');
    process.exit(1);
  }

  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    groups,
    specifier,
    dryRun,
    verbose,
    firstRelease,
    projects,
  });

  await releaseChangelog({
    groups,
    specifier,
    versionData: projectsVersionData,
    version: workspaceVersion,
    dryRun,
    verbose,
    from,
    interactive: 'projects',
    firstRelease,
    projects,
  });

  await execa({
    stdout: process.stdout,
    stderr: process.stderr,
  })`pnpm run build:packages --skip-nx-cache`;

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'otp',
      message: 'Enter NPM OTP:',
    },
  ]);

  await releasePublish({
    groups,
    specifier: 'patch',
    dryRun,
    verbose,
    otp: answers.otp,
    firstRelease,
    projects,
  });
})();
