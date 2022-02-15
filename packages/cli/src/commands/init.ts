import * as open from 'open';
import * as Configstore from 'configstore';
import { prompt } from '../client';
import { promptIntroQuestions } from './init.consts';
import { HttpServer } from '../server';
import { SERVER_PORT, SERVER_HOST, REDIRECT_ROUTH, API_OAUTH_URL } from '../constants';

export async function initCommand() {
  const config = new Configstore('notu-cli');
  try {
    const answers = await prompt(promptIntroQuestions);

    const userJwt = await gitHubOAuth();

    config.set('token', userJwt);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
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
    console.log(error);
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
