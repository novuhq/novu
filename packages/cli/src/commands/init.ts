import * as open from 'open';
import { Answers } from 'inquirer';
import { ChannelCTATypeEnum, ChannelTypeEnum, IApplication, ICreateNotificationTemplateDto } from '@notifire/shared';
import { prompt } from '../client';
import { environmentQuestions, existingSessionQuestions, introQuestions, registerMethodQuestions } from './init.consts';
import { HttpServer } from '../server';
import {
  SERVER_HOST,
  REDIRECT_ROUTE,
  API_OAUTH_URL,
  WIDGET_DEMO_ROUTH,
  API_TRIGGER_URL,
  CLIENT_LOGIN_URL,
  getServerPort,
  GITHUB_DOCKER_URL,
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

export async function initCommand() {
  try {
    const envAnswer = await prompt(environmentQuestions);

    if (envAnswer.env === 'self-hosted-docker') {
      await open(GITHUB_DOCKER_URL);

      return;
    }
    const config = new ConfigService();

    await config.clearStore();

    const existingApplication = await checkExistingApplication(config);
    if (existingApplication) {
      const { result } = await prompt(existingSessionQuestions(existingApplication));

      if (result !== 'new') {
        await handleExistingSession(result, config);

        return;
      }
      config.clearStore();
    }

    await handleOnboardingFlow(config);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

async function handleOnboardingFlow(config: ConfigService) {
  const httpServer = new HttpServer();

  await httpServer.listen();

  try {
    const answers = await prompt(introQuestions);

    const regMethod = await prompt(registerMethodQuestions);

    if (regMethod.value === 'github') {
      await gitHubOAuth(httpServer, config);
    }
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
  const demoDashboardUrl = await buildDemoDashboardUrl(applicationIdentifier, decodedToken);

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

async function buildDemoDashboardUrl(applicationIdentifier: string, decodedToken) {
  return [
    `http://${SERVER_HOST}:${await getServerPort()}${WIDGET_DEMO_ROUTH}?`,
    `applicationId=${applicationIdentifier}&`,
    `userId=${decodedToken._id}&`,
    `email=${decodedToken.email}&`,
    `$first_name=${decodedToken.firstName}&`,
    `$last_name=${decodedToken.lastName}`,
  ];
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

async function handleExistingSession(result: string, config: ConfigService) {
  if (result === 'visitDashboard') {
    const dashboardURL = `${CLIENT_LOGIN_URL}?token=${config.getToken()}`;

    await open(dashboardURL);
  } else if (result === 'exit') {
    process.exit();
  }
}
