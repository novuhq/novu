const inquirer = require('inquirer');

inquirer
  .prompt([
    {
      name: 'helloWorldName',
      message: 'What is your name?',
    },
  ])
  // eslint-disable-next-line promise/always-return
  .then((answers) => {
    // eslint-disable-next-line no-console
    console.info('Hello ', answers.helloWorldName);
  });
