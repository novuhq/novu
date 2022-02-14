import * as open from 'open';
import { Answers } from 'inquirer';
import { prompt } from '../client';
import { promptIntroArray } from './init.consts';
import { HttpServer } from '../server';
import { SERVER_PORT, SERVER_HOST, REDIRECT_ROUTH, API_OAUTH_URL } from '../constants';

let answers: Answers;

export async function initCommand() {
  try {
    answers = await prompt(promptIntroArray);

    await gitHubOAuth();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
}

async function gitHubOAuth(): Promise<string> {
  const httpServer: HttpServer = new HttpServer();
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
}
