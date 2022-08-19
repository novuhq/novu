const fs = require('fs');

const nodeModulesExist = fs.existsSync('node_modules');
const envInitialized = fs.existsSync('apps/api/src/.env');
let dependenciesInstalled = false;

async function reInstallProject() {
  const inquirer = require('inquirer');

  const questions = [
    {
      type: 'list',
      name: 'reinstall',
      message:
        'Are you changing branches like socks? just came from another branch? Do you wish us to reinstall the project for you?',
      choices: ['Yes', 'No'],
    },
  ];

  await inquirer.prompt(questions).then(async (answers) => {
    if (answers.reinstall === 'No') {
      return;
    }
    await setupProject();
  });
}

async function setupRunner() {
  const shell = require('shelljs');
  const waitPort = require('wait-port');
  const inquirer = require('inquirer');

  const questions = [
    {
      type: 'list',
      name: 'action',
      message: 'Welcome to the Novu codebase, what you want to do?',
      choices: ['Run the project', 'Test the project'],
    },
    {
      type: 'list',
      name: 'runConfiguration',
      message: 'What section of the project you want to run?',
      choices: ['Full project', 'Web & API', 'API Only'],
      when(answers) {
        return answers.action === 'Run the project';
      },
    },
    {
      type: 'list',
      name: 'runConfiguration',
      message: 'What section of the project you want to run?',
      choices: ['WEB tests', 'API tests'],
      when(answers) {
        return answers.action === 'Test the project';
      },
    },
    {
      type: 'list',
      name: 'runWebConfiguration',
      message: 'What section of the project you want to run?',
      choices: ['Open Cypress UI', 'Run Cypress test - CLI', 'Run Cypress Component test - CLI'],
      when(answers) {
        return answers.runConfiguration === 'WEB tests';
      },
    },
  ];

  inquirer.prompt(questions).then(async (answers) => {
    if (answers.runConfiguration === 'Full project') {
      shell.exec('npm run nx build @novu/api');
      shell.exec('npm run start', { async: true });

      await waitPort({
        host: 'localhost',
        port: 3000,
      });
      await waitPort({
        host: 'localhost',
        port: 4500,
      });
      await waitPort({
        host: 'localhost',
        port: 4200,
      });

      // eslint-disable-next-line no-console
      console.log(`
Everything is running 🎊

  Web: http://localhost:4200
  API: http://localhost:3000
    `);
    } else if (answers.runConfiguration === 'Web & API') {
      shell.exec('npm run nx build @novu/api');
      shell.exec('npm run start:web', { async: true });

      await new Promise((resolve) => setTimeout(resolve, 3000));
      shell.exec('npm run start:api', { async: true });

      await waitPort({
        host: 'localhost',
        port: 3000,
      });

      await waitPort({
        host: 'localhost',
        port: 4200,
      });

      // eslint-disable-next-line no-console
      console.log(`
Everything is running 🎊

  Web: http://localhost:4200
  API: http://localhost:3000
    `);
    } else if (answers.runConfiguration === 'API Only') {
      shell.exec('npm run nx build @novu/api');
      shell.exec('npm run start:api');
    } else if (
      answers.runWebConfiguration === 'Open Cypress UI' ||
      answers.runWebConfiguration === 'Run Cypress tests - CLI'
    ) {
      shell.exec('npm run nx build @novu/api');
      shell.exec('npm run nx build @novu/ws');

      shell.exec('npm run start:api:test', { async: true });
      shell.exec('npm run start:ws:test', { async: true });
      shell.exec('cd apps/web && npm run start', { async: true });

      await waitPort({
        host: 'localhost',
        port: 1336,
      });

      await waitPort({
        host: 'localhost',
        port: 1340,
      });

      await waitPort({
        host: 'localhost',
        port: 4200,
      });

      if (answers.runWebConfiguration === 'Open Cypress UI') {
        shell.exec('cd apps/web && npm run cypress:open');
      } else if (answers.runWebConfiguration === 'Run Cypress tests - CLI') {
        shell.exec('cd apps/web && npm run cypress:run');
      }
    } else if (answers.runWebConfiguration === 'Run Cypress Component test - CLI') {
      shell.exec('npm run nx build @novu/web');
      shell.exec('cd apps/web && npm run cypress:run:components');
    }

    return true;
  });
}

const informAboutInitialSetup = () => {
  const rlp = require('readline');

  return new Promise((resolve, reject) => {
    const rl = rlp.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      'Looks like its the first time running this project on your machine. We will start by installing pnpm dependencies. ' +
        '\nDo you want to continue? Yes/No\n',
      function (answer) {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          rl.close();
          resolve();

          return;
        }

        reject('exit.. because dependencies are mandatory.');
      }
    );
  });
};

const setupProject = () =>
  new Promise((resolve, reject) => {
    const { spawn } = require('child_process');

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'cmd' : 'npm';
    const args = isWindows ? ['/c', 'npm run setup:project'] : ['run setup:project'];

    const command = spawn(cmd, args, {
      shell: true,
      stdio: 'inherit',
    });

    function onExit() {
      command.kill('SIGINT');
    }

    process.on('SIGTERM', onExit);
    process.on('SIGINT', onExit);

    command.on('exit', (exitCode) => {
      if (parseInt(exitCode) !== 0) {
        return reject(new Error(exitCode));
      }

      // eslint-disable-next-line no-console
      console.log('Finished installing building project!');
      dependenciesInstalled = true;
      resolve();
    });
  });

async function main() {
  if (!nodeModulesExist || !envInitialized) {
    await informAboutInitialSetup();

    await setupProject();
  }

  await setupRunner();
}

main().catch((rej) => {
  // eslint-disable-next-line no-console
  console.log(rej);
  process.kill(process.pid, 'SIGTERM');
});
