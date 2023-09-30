import { ListQuestionOptions } from 'inquirer';
import * as chalk from 'chalk';
import * as gradient from 'gradient-string';
import { passwordConstraints } from '@novu/shared';

export const introQuestions: ListQuestionOptions[] = [
  {
    name: 'environmentName',
    message: 'What is your organization or project name?',
    validate(input: any, answers?): boolean | string | Promise<boolean | string> {
      if (
        ['test', 'testnovu', 'testapp', 'novutest'].includes(
          input
            ?.trim()
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
        )
      ) {
        return `Cache invalidation and naming things... \n
We recommend writing your project or company name ;) If you're just curious about Novu, type 'curious'
        `;
      } else if (!input?.trim().length) {
        return `Please enter a valid name. If you're just curious about Novu, type 'curious' ;)`;
      }

      return true;
    },
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
        name: `Try on a free cloud account ${chalk.bold.green(`(Quickest)`)}`,
        value: 'cloud',
      },
      {
        name: 'Self-hosting - Manual Setup',
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
        name: `Sign-up with GitHub`,
        value: 'github',
      },
      {
        name: 'With Email & Password',
        value: 'email',
      },
    ],
  },
];

export const privateDomainQuestions: (email: string) => ListQuestionOptions[] = (email: string) => [
  {
    name: 'domain',
    type: 'list',
    message: `We recommend to use you work e-mail, so important updates won't reach your personal e-mail.`,
    choices: [
      {
        name: `Update to work e-mail`,
        value: 'updateEmail',
      },
      {
        name: `Keep current e-mail ${chalk.grey('(' + email + ')')}`,
        value: 'keepCurrent',
      },
    ],
  },
];

export const fullNameQuestion: ListQuestionOptions[] = [
  {
    type: 'text',
    name: 'fullName',
    message: 'Your Full Name',
    validate: (input) => {
      if (!input || input.length < 3) return 'Please write your full name';

      return true;
    },
  },
];

export const proceedSignupQuestions: ListQuestionOptions[] = [
  {
    type: 'list',
    name: 'proceedSignup',
    message: `${chalk.red('Error:')} This account already exists, how do you want to proceed?`,
    choices: [
      {
        name: `Reset Password`,
        value: 'resetPassword',
      },
      {
        name: 'Use a different email',
        value: 'differentEmail',
      },
    ],
  },
];

export const passwordQuestion: ListQuestionOptions[] = [
  {
    type: 'password',
    name: 'password',
    message: 'Password',
    validate: (input) => {
      const match = input.match(passwordConstraints.pattern);

      return match
        ? true
        : 'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-';
    },
  },
];

export const emailQuestion: ListQuestionOptions[] = [
  {
    type: 'text',
    name: 'email',
    message: 'E-mail address',
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
