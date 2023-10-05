import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const submoduleDir = 'enterprise/packages';

function runCommand(command: string, directory?: string) {
  console.log(`Running command: ${command}${directory ? `directory:${directory}` : '.'}`);
  execSync(command, {
    stdio: 'inherit',
    cwd: directory,
  });
}

try {
  console.log('Step 1: Run lerna version in monorepo without committing or creating a release');
  runCommand('pnpm lerna version patch --yes --no-git-tag-version --no-push --force-publish');

  console.log('Step 2: Extract new version from lerna json file');
  const lernaJson = JSON.parse(readFileSync(join(__dirname, '../lerna.json'), 'utf-8'));
  const newVersion = lernaJson.version;
  console.log(`New version ${newVersion} extracted`);

  console.log('Step 3: Push changes in submodule');
  runCommand('git add .', submoduleDir);
  runCommand('git commit -m "chore: update versions"', submoduleDir);
  runCommand('git push', submoduleDir);

  console.log('Step 4: Create realease tag for submodule');
  runCommand(`git tag v${newVersion}`, submoduleDir);
  runCommand('git push --tags', submoduleDir);

  console.log('Step 5: Commit version changes and submodule updated hash main repository');
  runCommand('git add .');
  runCommand('git commit -m "chore: update versions"');

  console.log('Step 6: Create realease tag for main repo and push');
  runCommand(`git tag v${newVersion}`);
  runCommand('git push --tags');
} catch (error) {
  console.error(`Error: ${error}`);
}
