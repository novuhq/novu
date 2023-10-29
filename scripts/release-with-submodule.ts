/* eslint-disable no-console */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const submoduleDir = 'enterprise';

function runCommand(command: string, directory?: string) {
  console.log(`Running command: ${command}${directory ? `directory:${directory}` : '.'}`);
  execSync(command, {
    stdio: 'inherit',
    cwd: directory,
  });
}

const validateGitWorkingTree = (path?: string) => {
  const options = path ? { cwd: path } : {};

  const gitStatus = execSync('git status --porcelain', options).toString();
  if (gitStatus) {
    console.error(
      'Working tree has uncommitted changes' +
        submoduleDir +
        ', please commit or remove the following changes before continuing:\n' +
        gitStatus
    );

    throw new Error('Working tree has uncommitted changes');
  } else {
    console.log('No uncommitted changes found');
  }
};

(() => {
  try {
    /*
     * This step is necessary as the lerna version command lacks the capability to validate the Git tree of submodules,
     * thus requiring this manual procedure.
     */
    console.log('Step 1: Check for uncommitted changes in submodule git');
    validateGitWorkingTree(submoduleDir);

    /*
     * This step is essential due to the utilization of the -no-git-tag-version flag in the lerna version command.
     * The flag prevents Lerna from validating the Git tree, hence necessitating this manual intervention.
     */
    console.log('Step 2: Check for uncommitted changes in main git');
    validateGitWorkingTree();

    console.log('Step 3: Run lerna version in monorepo without committing or creating a release');
    runCommand('pnpm lerna version patch --yes --no-git-tag-version --no-push');

    console.log('Step 4: Extract new version from lerna json file');
    const lernaJson = JSON.parse(readFileSync(join(__dirname, '../lerna.json'), 'utf-8'));
    const newVersion = lernaJson.version;
    console.log(`New version ${newVersion} extracted`);

    console.log('Step 5: Push changes in submodule');
    runCommand('git add .', submoduleDir);
    runCommand('git commit -m "chore(release): publish - ci skip"', submoduleDir);
    runCommand('git push', submoduleDir);

    console.log('Step 6: Create release tag for submodule');
    runCommand(`git tag v${newVersion}`, submoduleDir);
    runCommand('git push --tags', submoduleDir);

    console.log('Step 7: Commit version changes and submodule updated hash main repository');
    runCommand('git add .');
    runCommand('git commit -m "chore(release): publish - ci skip"');
    runCommand('git push');

    console.log('Step 8: Create release tag for main repo and push');
    runCommand(`git tag v${newVersion}`);
    runCommand('git push --tags');
  } catch (error) {
    console.error(`Error: ${error}`);
  }
})();
