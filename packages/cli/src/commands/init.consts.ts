import { providers } from '@notifire/shared';
import { InquirerQuestion } from '../client';

export const promptIntroArray: InquirerQuestion[] = [
  {
    name: 'applicationName',
    message: 'What is your application name?',
    default: 'Gosha corp',
    type: null,
    choices: null,
  },
  {
    type: 'checkbox',
    name: 'providers',
    message: 'Which provider do you want to examine?',
    choices: providers,
    default: null,
  },
];
