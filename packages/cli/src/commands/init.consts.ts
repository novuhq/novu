import { ListQuestionOptions } from 'inquirer';
import * as chalk from 'chalk';
import * as gradient from 'gradient-string';

export const introQuestions: ListQuestionOptions[] = [
  {
    name: 'environmentName',
    message: 'What is your application name?',
    default: 'Acme App.',
  },
];

export const existingSessionQuestions = (existingEnvironment): ListQuestionOptions[] => {
  return [
    {
      type: 'list',
      name: 'result',
      message: `Looks like you already have a created an account for ${existingEnvironment.name}`,
      choices: [
        {
          name: `Visit ${existingEnvironment.name} Dashboard`,
          value: 'visitDashboard',
        },
        {
          name: 'Cancel',
          value: 'exit',
        },
      ],
    },
  ];
};

export const environmentQuestions: ListQuestionOptions[] = [
  {
    type: 'list',
    name: 'env',
    message: `Now lets setup your environment. How would you like to proceed?`,
    choices: [
      {
        name: `Create a free cloud account ${chalk.bold.green(`(Recommended)`)}`,
        value: 'cloud',
      },
      {
        name: 'Run manually using docker',
        value: 'self-hosted-docker',
      },
    ],
  },
];

export const registerMethodQuestions: ListQuestionOptions[] = [
  {
    type: 'list',
    name: 'value',
    message: `Create your account with:`,
    choices: [
      {
        name: `Sign-in with GitHub`,
        value: 'github',
      },
      {
        name: 'With Email & Password',
        value: 'in-cli',
        disabled: 'Coming soon',
      },
    ],
  },
];

export const termAndPrivacyQuestions: ListQuestionOptions[] = [
  {
    type: 'list',
    name: 'accept',
    message: `I accept the Terms and Conditions (https://novu.co/terms) and have read the Privacy Policy (https://novu.co/privacy)`,
    choices: [
      {
        name: `Yes`,
        value: true,
      },
      {
        name: 'No',
        value: false,
      },
    ],
  },
];

export function showWelcomeScreen() {
  const textGradient = gradient('#0099F7', '#ff3432');
  const logoGradient = gradient('#DD2476', '#FF512F');
  const logo = `
                        @@@@@@@@@@@@@        
                @@@       @@@@@@@@@@@        
              @@@@@@@@       @@@@@@@@        
            @@@@@@@@@@@@       @@@@@@     @@ 
           @@@@@@@@@@@@@@@@      @@@@     @@@
          @@@@@@@@@@@@@@@@@@@       @     @@@
          @@@@@         @@@@@@@@         @@@@
           @@@     @       @@@@@@@@@@@@@@@@@@
           @@@     @@@@      @@@@@@@@@@@@@@@@
            @@     @@@@@@       @@@@@@@@@@@@ 
                   @@@@@@@@       @@@@@@@@   
                   @@@@@@@@@@@       @@@     
                   @@@@@@@@@@@@@                  
                          `;

  const items = logo.split('\n').map((row) => logoGradient(row));

  /* eslint-disable no-console */
  console.log(chalk.bold(items.join('\n')));
  console.log(chalk.bold(`                      Welcome to NOVU!`));
  console.log(chalk.bold(textGradient(`         The open-source notification infrastructure\n`)));
  console.log(chalk.bold(`Now let's setup your account and send your first notification`));
  /* eslint-enable  no-console */
}
