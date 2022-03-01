import { providers } from '@notifire/shared';
import { ListQuestionOptions } from 'inquirer';
import * as chalk from 'chalk';

export const introQuestions: ListQuestionOptions[] = [
  {
    name: 'applicationName',
    message: 'What is your application name?',
    default: 'Acme App.',
  },
  {
    type: 'checkbox',
    name: 'providers',
    message: 'What delivery providers you are using? (Optional)',
    choices: providers.map((provider) => `${provider.displayName} ${chalk.dim(`(${provider.type})`)}`),
  },
];

export const existingSessionQuestions = (existingApplication): ListQuestionOptions[] => {
  return [
    {
      type: 'list',
      name: 'result',
      message: `Looks like you already have a created an account for ${existingApplication.name}`,
      choices: [
        {
          name: `Visit ${existingApplication.name} Dashboard`,
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
        name: `Create a free hosted cloud account (Recommended)`,
        value: 'cloud',
      },
      {
        name: 'Run locally using docker',
        value: 'self-hosted-docker',
      },
    ],
  },
];

export const registerMethodQuestions: ListQuestionOptions[] = [
  {
    type: 'list',
    name: 'value',
    message: `How do you want to register`,
    choices: [
      {
        name: `Using GitHub`,
        value: 'github',
      },
      {
        name: 'Email & Password',
        value: 'in-cli',
        disabled: 'Coming soon',
      },
    ],
  },
];
