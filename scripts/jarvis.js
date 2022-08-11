const inquirer = require('inquirer');
const shell = require('shelljs');
const waitPort = require('wait-port');

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
    choices: ['All of it', 'Web & API', 'API Only'],
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
  if (answers.runConfiguration === 'All of it') {
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
