import * as open from 'open';
import { Answers } from 'inquirer';
import {
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  IApplication,
  ICreateNotificationTemplateDto,
  IJwtPayload,
  providers,
} from '@notifire/shared';
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
  getApplicationApiKeys,
} from '../api';
import { ConfigService } from '../services';

export async function initCommand() {
  const config = new ConfigService();
  if (process.env.NODE_ENV === 'dev') {
    await config.clearStore();
  }

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

    await gitHubOAuth(httpServer, config);
    await createOrganizationHandler(config, answers);

    const applicationIdentifier = await createApplicationHandler(config, answers);

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
    const existingApplication = await getApplicationMe();
    const keys = await getApplicationApiKeys();

    config.setValue('apiKey', keys[0]?.key);

    return existingApplication.identifier;
  }

  const createApplicationResponse = await createApplication(answers.applicationName);
  const newUserJwt = await switchApplication(createApplicationResponse._id);

  config.setValue('apiKey', createApplicationResponse.apiKeys[0].key);
  storeToken(config, newUserJwt);

  return createApplicationResponse.identifier;
}

async function raiseDemoDashboard(httpServer: HttpServer, config: ConfigService, applicationIdentifier: string) {
  const notificationGroupResponse = await getNotificationGroup();

  const template = buildTemplate(notificationGroupResponse[0]._id);
  const createNotificationTemplatesResponse = await createNotificationTemplates(template);

  const decodedToken = config.getDecodedToken();
  const demoDashboardUrl = await buildDemoDashboardUrl(applicationIdentifier, decodedToken, config);

  storeTriggerPayload(config, createNotificationTemplatesResponse, decodedToken);

  await open(demoDashboardUrl.join(''));
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

async function buildDemoDashboardUrl(applicationIdentifier: string, decodedToken: IJwtPayload, config: ConfigService) {
  const dashboardURL = `${CLIENT_LOGIN_URL}?token=${config.getToken()}`;

  return [
    `http://${SERVER_HOST}:${await getServerPort()}${WIDGET_DEMO_ROUTH}?`,
    `applicationId=${applicationIdentifier}&`,
    `userId=${decodedToken._id}&`,
    `apiKey=${config.getValue('apiKey')}&`,
    `$first_name=${decodedToken.firstName}&`,
    `$last_name=${decodedToken.lastName}`,
  ];
}

function storeTriggerPayload(config: ConfigService, createNotificationTemplatesResponse, decodedToken) {
  const dashboardURL = `${CLIENT_LOGIN_URL}?token=${config.getToken()}`;

  const tmpPayload: { key: string; value: string }[] = [
    { key: 'url', value: API_TRIGGER_URL },
    { key: 'apiKey', value: config.getValue('apiKey') },
    { key: 'name', value: createNotificationTemplatesResponse.triggers[0].identifier },
    { key: '$user_id', value: decodedToken._id },
    { key: '$first_name', value: decodedToken.firstName },
    { key: '$last_name', value: decodedToken.lastName },
    { key: '$email', value: decodedToken.email },
    { key: 'token', value: config.getToken() },
    { key: 'dashboardURL', value: dashboardURL },
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
  // eslint-disable-next-line no-console
  console.log('Program still running, press any key to exit');
  await keyPress();
  // eslint-disable-next-line no-console
  console.log('See you in the admin panel :)');
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
