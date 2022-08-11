const inquirer = require('inquirer');
const shell = require('shelljs');
const waitPort = require('wait-port');

const questions = [
  {
    type: 'list',
    name: 'action',
    message: 'Welcome to the Novu codebase, what you want to do?',
    choices: ['Run locally', 'Run tests'],
  },
  {
    type: 'list',
    name: 'runConfiguration',
    message: 'What section of the project you want to run?',
    choices: ['All of it', 'API Only'],
    when(answers) {
      return answers.action === 'Run locally';
    },
  },
  {
    type: 'list',
    name: 'runConfiguration',
    message: 'What section of the project you want to run?',
    choices: ['WEB tests', 'API tests'],
    when(answers) {
      return answers.action === 'Run tests';
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
  shell.exec('npm run build');

  if (answers.runConfiguration === 'All of it') {
    shell.exec('npm run start');
  } else if (answers.runConfiguration === 'API Only') {
    shell.exec('npm run start:api');
  } else if (
    answers.runWebConfiguration === 'Open Cypress UI' ||
    answers.runWebConfiguration === 'Run Cypress tests - CLI'
  ) {
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
    shell.exec('cd apps/web && npm run cypress:run:components');
  }
});
