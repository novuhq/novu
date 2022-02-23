import * as open from 'open';
import { prompt } from '../client';
import { promptIntroQuestions } from './init.consts';
import { HttpServer } from '../server';
import { SERVER_PORT, SERVER_HOST, REDIRECT_ROUTE, API_OAUTH_URL } from '../constants';
import { storeHeader } from '../api/api.service';
import { createOrganization, switchOrganization } from '../api/organization';
import { createApplication } from '../api/application';
import { ConfigService } from '../services';

export async function initCommand() {
  try {
    const answers = await prompt(promptIntroQuestions);

    const userJwt = await gitHubOAuth();

    const config = new ConfigService();

    storeToken(config, userJwt);

    if (!config.isOrganizationIdExist()) {
      const createOrganizationResponse = await createOrganization(answers.applicationName);
      const organizationId = createOrganizationResponse._id;

      const newUserJwt = await switchOrganization(organizationId);

      storeToken(config, newUserJwt);
    }
    await createApplication(answers.applicationName);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error.response.data);
  }
}

async function gitHubOAuth(): Promise<string> {
  const httpServer = new HttpServer();
  const redirectUrl = `http://${SERVER_HOST}:${SERVER_PORT}${REDIRECT_ROUTE}`;

  try {
    await httpServer.listen();

    await open(`${API_OAUTH_URL}?&redirectUrl=${redirectUrl}`);

    return await httpServer.redirectResponse();
  } catch (error) {
    throw new Error('Could not generate jwt via github oath');
  } finally {
    httpServer.close();
  }
}

/*
 * Stores token in config and axios default headers
 */
function storeToken(config: ConfigService, userJwt: string) {
  config.setValue('token', userJwt);
  storeHeader('authorization', `Bearer ${config.getValue('token')}`);
}
