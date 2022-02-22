import * as open from 'open';
import { Answers } from 'inquirer';
import { prompt } from '../client';
import { promptIntroQuestions } from './init.consts';
import { HttpServer } from '../server';
import { SERVER_PORT, SERVER_HOST, REDIRECT_ROUTE, API_OAUTH_URL } from '../constants';
import { storeHeader } from '../api/api.service';
import { createOrganization, switchOrganization } from '../api/organization';
import { createApplication } from '../api/application';
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

async function createApplicationHandler(config: ConfigService, answers: Answers): Promise<void> {
  await createApplication(answers.applicationName);
}

/*
 * Stores token in config and axios default headers
 */
function storeToken(config: ConfigService, userJwt: string) {
  config.setValue('token', userJwt);
  storeHeader('authorization', `Bearer ${config.getValue('token')}`);
}
