import { providers } from '@notifire/shared';
import { ListQuestionOptions } from 'inquirer';

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
    choices: providers.map((provider) => `${provider.displayName} (${provider.type})`),
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
          name: 'Create New Account',
          value: 'new',
        },
        {
          name: 'Cancel',
          value: 'exit',
        },
      ],
    },
  ];
};
