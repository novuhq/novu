import * as open from 'open';
import * as Configstore from 'configstore';
import { prompt } from '../client';
import { promptIntroQuestions } from './init.consts';
import { HttpServer } from '../server';
import { SERVER_PORT, SERVER_HOST, REDIRECT_ROUTH, API_OAUTH_URL } from '../constants';
import { storeHeader } from '../api/api.service';
import { createOrganization, switchOrganization } from '../api/organization';
import { createApplication } from '../api/application';

export async function initCommand() {
  try {
    const answers = await prompt(promptIntroQuestions);

    const userJwt = await gitHubOAuth();

    const config = new Configstore('notu-cli');
    storeToken(config, userJwt);

    let organizationId = getOrganizationId(userJwt);

    if (!organizationId) {
      const createOrganizationResponse = await createOrganization(answers.applicationName);
      organizationId = createOrganizationResponse._id;

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
  const redirectUrl = `http://${SERVER_HOST}:${SERVER_PORT}${REDIRECT_ROUTH}`;
  try {
    await httpServer.listen();

    await open(`${API_OAUTH_URL}?&redirectUrl=${redirectUrl}`);

    return await serverResponse(httpServer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return null;
  } finally {
    httpServer.close();
  }
}

function serverResponse(server: HttpServer): Promise<string> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (server.token) {
        clearInterval(interval);
        resolve(server.token);
      }
    }, 300);
  });
}

function getOrganizationId(userJwt: string): string {
  const tokens = userJwt.split('.');
  const jsonToken = JSON.parse(Buffer.from(tokens[1], 'base64').toString());
  return jsonToken.organizationId;
}

/*
 * Stores token in config and axios default headers
 */
function storeToken(config: Configstore, userJwt: string) {
  config.set('token', userJwt);
  storeHeader('authorization', `Bearer ${config.get('token')}`);
}
