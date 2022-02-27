import * as open from 'open';
import { Answers } from 'inquirer';
import * as gradient from 'gradient-string';
import * as chalk from 'chalk';
import * as ora from 'ora';
import { ChannelCTATypeEnum, ChannelTypeEnum, IApplication, ICreateNotificationTemplateDto } from '@notifire/shared';

import { prompt } from '../client';
import { promptIntroQuestions } from './init.consts';
import { HttpServer } from '../server';
import {
  SERVER_HOST,
  REDIRECT_ROUTE,
  API_OAUTH_URL,
  WIDGET_DEMO_ROUTH,
  API_TRIGGER_URL,
  CLIENT_LOGIN_URL,
  getServerPort,
} from '../constants';
import {
  storeHeader,
  createOrganization,
  switchOrganization,
  createApplication,
  getApplicationMe,
  switchApplication,
  getNotificationGroup,
  createNotificationTemplates,
} from '../api';
import { ConfigService } from '../services';

const turboGradient = gradient('#0099F7', '#F11712');
const logoGradient = gradient('#DD2476', '#FF512F');

export async function initCommand() {
  const config = new ConfigService();

  const logo = `
                        @@@@@@@@@@@@@        
                @@@       @@@@@@@@@@@        
              @@@@@@@@      (@@@@@@@@        
            @@@@@@@@@@@@       @@@@@@     @@ 
           @@@@@@@@@@@@@@@@      @@@@     @@@
           @@@@@@@@&@@@@@@@@@       @     @@@
          @@@@@         @@@@@@@@         @@@@
           @@@     @       @@@@@@@@@@@@@@@@@@
           @@@    .@@@@      @@@@@@@@@@@@@@@@
            @@    .@@@@@@       @@@@@@@@@@@@ 
                  .@@@@@@@@,      @@@@@@@@   
                  .@@@@@@@@@@@       @@@     
                   @@@@@@@@@@@@@                  
                          `;

  const items = logo.split('\n').map((row) => logoGradient(row));

  console.log(chalk.bold(items.join('\n')));
  console.log(chalk.bold(`                      Welcome to NOTU`));
  console.log(chalk.bold(turboGradient(`         The open-source notification infrastructure\n`)));
  console.log(chalk.bold(`Now let's setup your account and send a first notification`));

  const existingApplication = await checkExistingApplication(config);
  if (existingApplication) {
    const result = await handleExistingSession(config, existingApplication);

    if (result === 'new') {
      config.clearStore();
    } else if (result === 'visitDashboard') {
      const dashboardURL = `${CLIENT_LOGIN_URL}?token=${config.getToken()}`;

      await open(dashboardURL);

      return;
    } else if (result === 'exit') {
      process.exit();

      return;
    }
  }

  await handleOnboardingFlow(config);
}

async function handleOnboardingFlow(config: ConfigService) {
  const httpServer = new HttpServer();

  await httpServer.listen();

  try {
    const answers = await prompt(promptIntroQuestions);
    const spinner = ora('Waiting for a brave unicorn to login').start();

    try {
      await gitHubOAuth(httpServer, config);
    } catch (e) {
      spinner.fail('Something un-expected happend :(');
      process.exit();
    }
    spinner.stop();

    const setUpSpinner = ora('Setting up your new account').start();
    let applicationIdentifier: string;

    try {
      await createOrganizationHandler(config, answers);
      applicationIdentifier = await createApplicationHandler(config, answers);
    } catch (e) {
      setUpSpinner.fail('Something un-expected happend :(');
      process.exit();
    }

    const address = httpServer.getAddress();

    setUpSpinner.succeed(`Created your account successfully. 
  Visit: ${address}/demo to continue`);

    await raiseDemoDashboard(httpServer, config, applicationIdentifier);
    await exitHandler();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    httpServer.close();
  }
}

async function gitHubOAuth(httpServer: HttpServer, config: ConfigService): Promise<void> {
  const redirectUrl = `http://${SERVER_HOST}:${await getServerPort()}${REDIRECT_ROUTE}`;

  try {
    await open(`${API_OAUTH_URL}?&redirectUrl=${redirectUrl}`);

    const userJwt = await httpServer.redirectResponse();

    storeToken(config, userJwt);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

async function createOrganizationHandler(config: ConfigService, answers: Answers) {
  if (config.isOrganizationIdExist()) return;

  const createOrganizationResponse = await createOrganization(answers.applicationName);

  const newUserJwt = await switchOrganization(createOrganizationResponse._id);

  storeToken(config, newUserJwt);
}

async function createApplicationHandler(config: ConfigService, answers: Answers): Promise<string> {
  if (config.isApplicationIdExist()) {
    return (await getApplicationMe()).identifier;
  }
  const createApplicationResponse = await createApplication(answers.applicationName);

  config.setValue('apiKey', createApplicationResponse.apiKeys[0].key);

  const newUserJwt = await switchApplication(createApplicationResponse._id);

  storeToken(config, newUserJwt);

  return createApplicationResponse.identifier;
}

async function raiseDemoDashboard(httpServer: HttpServer, config: ConfigService, applicationIdentifier: string) {
  const notificationGroupResponse = await getNotificationGroup();

  const template = buildTemplate(notificationGroupResponse[0]._id);
  const createNotificationTemplatesResponse = await createNotificationTemplates(template);

  const decodedToken = config.getDecodedToken();
  const demoDashboardUrl = await getDemoDashboardUrl();

  storeTriggerPayload(config, createNotificationTemplatesResponse, decodedToken);

  await open(demoDashboardUrl);
}

function buildTemplate(notificationGroupId: string): ICreateNotificationTemplateDto {
  const redirectUrl = `${CLIENT_LOGIN_URL}?token={{token}}`;

  const messages = [
    {
      type: ChannelTypeEnum.IN_APP,
      content:
        'Welcome <b>{{$first_name}}</b>! This is your first notification, click on it to visit your live dashboard',
      cta: {
        type: ChannelCTATypeEnum.REDIRECT,
        data: {
          url: redirectUrl,
        },
      },
    },
  ];

  return {
    notificationGroupId,
    name: 'On-boarding notification',
    active: true,
    draft: false,
    messages,
    tags: null,
    description: null,
  };
}

async function getDemoDashboardUrl() {
  return `http://${SERVER_HOST}:${await getServerPort()}${WIDGET_DEMO_ROUTH}`;
}

function storeTriggerPayload(config: ConfigService, createNotificationTemplatesResponse, decodedToken) {
  const tmpPayload: { key: string; value: string }[] = [
    { key: 'url', value: API_TRIGGER_URL },
    { key: 'apiKey', value: config.getValue('apiKey') },
    { key: 'name', value: createNotificationTemplatesResponse.triggers[0].identifier },
    { key: '$user_id', value: decodedToken._id },
    { key: '$first_name', value: decodedToken.firstName },
    { key: '$last_name', value: decodedToken.lastName },
    { key: '$email', value: decodedToken.email },
    { key: 'applicationId', value: decodedToken.applicationId },
    { key: 'token', value: config.getToken() },
  ];

  config.setValue('triggerPayload', JSON.stringify(tmpPayload));
}

/*
 * Stores token in config and axios default headers
 */
function storeToken(config: ConfigService, userJwt: string) {
  config.setValue('token', userJwt);
  storeHeader('authorization', `Bearer ${config.getToken()}`);
}

async function exitHandler(): Promise<void> {
  await keyPress();
}

const keyPress = async (): Promise<void> => {
  return new Promise((resolve) =>
    process.stdin.once('data', () => {
      resolve();
    })
  );
};

async function checkExistingApplication(config: ConfigService): Promise<IApplication | null> {
  const isSessionExists = !!config.getDecodedToken();
  if (isSessionExists && process.env.NODE_ENV !== 'dev') {
    storeToken(config, config.getToken());

    let existingApplication: IApplication;

    try {
      existingApplication = await getApplicationMe();
      if (!existingApplication) {
        return null;
      }
    } catch (e) {
      config.clearStore();

      return null;
    }

    return existingApplication;
  }

  return null;
}

async function handleExistingSession(config: ConfigService, existingApplication: IApplication) {
  const { result } = await prompt([
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
  ]);

  return result;
}
