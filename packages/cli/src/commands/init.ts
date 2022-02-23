import * as open from 'open';
import { Answers } from 'inquirer';
import { ChannelCTATypeEnum, ChannelTypeEnum, ICreateNotificationTemplateDto } from '@notifire/shared';
import { prompt } from '../client';
import { promptIntroQuestions } from './init.consts';
import { HttpServer } from '../server';
import { SERVER_PORT, SERVER_HOST, REDIRECT_ROUTE, API_OAUTH_URL, CLIENT_LOGIN_URL } from '../constants';
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
  const httpServer = new HttpServer();

  await httpServer.listen();
  const config = new ConfigService();

  try {
    const answers = await prompt(promptIntroQuestions);

    await gitHubOAuth(httpServer, config);

    await createOrganizationHandler(config, answers);

    await createApplicationHandler(config, answers);

    await raiseDemoDashboard();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    httpServer.close();
  }
}

async function gitHubOAuth(httpServer: HttpServer, config: ConfigService): Promise<void> {
  const redirectUrl = `http://${SERVER_HOST}:${SERVER_PORT}${REDIRECT_ROUTE}`;

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

async function raiseDemoDashboard() {
  const notificationGroupResponse = await getNotificationGroup();

  const template = buildTemplate(notificationGroupResponse.notificationGroupResponse[0]._id);

  await createNotificationTemplates(template);
}

function buildTemplate(notificationGroupId: string): ICreateNotificationTemplateDto {
  const redirectUrl = `${CLIENT_LOGIN_URL}?token={{token}}`;

  const messages = [
    {
      type: ChannelTypeEnum.IN_APP,
      content:
        'Welcome <b>{{firstName}}</b>! This is your first notification, click on it to visit your live dashboard',
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

/*
 * Stores token in config and axios default headers
 */
function storeToken(config: ConfigService, userJwt: string) {
  config.setValue('token', userJwt);
  storeHeader('authorization', `Bearer ${config.getValue('token')}`);
}
