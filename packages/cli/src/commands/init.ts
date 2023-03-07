import * as open from 'open';
import { Answers } from 'inquirer';
import * as ora from 'ora';
import { v4 as uuidv4 } from 'uuid';
import { IEnvironment, SignUpOriginEnum } from '@novu/shared';
import { prompt } from '../client';
import {
  emailQuestion,
  environmentQuestions,
  existingSessionQuestions,
  fullNameQuestion,
  introQuestions,
  passwordQuestion,
  privateDomainQuestions,
  proceedSignupQuestions,
  registerMethodQuestions,
  showWelcomeScreen,
  termAndPrivacyQuestions,
} from './init.consts';
import { HttpServer } from '../server';
import {
  SERVER_HOST,
  REDIRECT_ROUTE,
  API_OAUTH_URL,
  WIDGET_DEMO_ROUTE,
  API_TRIGGER_URL,
  CLIENT_LOGIN_URL,
  getServerPort,
  GITHUB_DOCKER_URL,
  EMBED_PATH,
} from '../constants';
import {
  storeHeader,
  createOrganization,
  switchOrganization,
  createEnvironment,
  getEnvironmentMe,
  switchEnvironment,
  getNotificationGroup,
  createNotificationTemplates,
  getEnvironmentApiKeys,
} from '../api';
import { AnalyticService, ConfigService, AnalyticsEventEnum, ANALYTICS_SOURCE } from '../services';
import { signup, updateEmail } from '../api/auth';
import * as chalk from 'chalk';
import { privateEmailDomains } from '../constants/domains';

export enum ChannelCTATypeEnum {
  REDIRECT = 'redirect',
}

const anonymousId = uuidv4();
const analytics = new AnalyticService();

export async function initCommand() {
  try {
    await showWelcomeScreen();

    const config = new ConfigService();
    if (process.env.NODE_ENV === 'dev') {
      await config.clearStore();
    }

    const existingEnvironment = await checkExistingEnvironment(config);
    const isSessionExists = config.getDecodedToken();

    analytics.track({
      event: AnalyticsEventEnum.CLI_LAUNCHED,
      identity: { anonymousId: isSessionExists ? undefined : anonymousId, userId: isSessionExists?._id },
      data: {
        existingEnvironment: !!existingEnvironment,
      },
    });

    if (existingEnvironment) {
      const { result } = await prompt(existingSessionQuestions(existingEnvironment));
      const user = config.getDecodedToken();

      analytics.identify(user);
      if (result === 'visitDashboard') {
        await handleExistingSession(result, config);

        return;
      }
      await analytics.flush();
      process.exit();
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

  let spinner: ora.Ora = null;

  try {
    const answers = await prompt(introQuestions);

    analytics.track({
      identity: { anonymousId },
      event: AnalyticsEventEnum.CREATE_APP_QUESTION_EVENT,
    });

    const envAnswer = await prompt(environmentQuestions);

    analytics.track({
      identity: { anonymousId },
      event: AnalyticsEventEnum.ENVIRONMENT_SELECT_EVENT,
      data: {
        environment: envAnswer.env,
      },
    });

    if (envAnswer.env === 'self-hosted-docker') {
      await open(GITHUB_DOCKER_URL);
      await analytics.flush();

      return;
    }

    const regMethod = await prompt(registerMethodQuestions);

    analytics.track({
      identity: { anonymousId },
      event: AnalyticsEventEnum.REGISTER_METHOD_SELECT_EVENT,
      data: {
        environment: regMethod.value,
      },
    });

    const { accept } = await prompt(termAndPrivacyQuestions);

    analytics.track({
      identity: { anonymousId },
      event: AnalyticsEventEnum.TERMS_AND_CONDITIONS_QUESTION,
      data: {
        accepted: accept,
      },
    });

    if (accept === false) {
      await analytics.flush();
      process.exit();
    }

    if (regMethod.value === 'github') {
      spinner = ora('Waiting for a brave unicorn to login').start();
      await gitHubOAuth(httpServer, config);
      spinner.stop();
    } else if (regMethod.value === 'email') {
      await signUp(config);
    }

    spinner = ora('Setting up your new account').start();

    await createOrganizationHandler(config, answers);

    const user = config.getDecodedToken();

    if (regMethod.value === 'github' && privateEmailDomains.includes(user.email.split('@')[1])) {
      analytics.track({
        identity: { anonymousId },
        event: AnalyticsEventEnum.PRIVATE_EMAIL_ATTEMPT,
        data: {
          method: 'github',
        },
      });

      spinner.stop();
      let updateErrorForEmail = false;
      do {
        const { domain } = await prompt(privateDomainQuestions(user.email));

        if (domain === 'updateEmail') {
          const { email } = await prompt(emailQuestion);

          try {
            await updateEmail({ email });
          } catch (e) {
            const error = e.response.data;
            updateErrorForEmail = true;
            console.error('Un-expected error ', error);
          }
        }
      } while (updateErrorForEmail);
    }

    spinner.start();

    analytics.track({
      identity: { anonymousId },
      event: AnalyticsEventEnum.ACCOUNT_CREATED,
      data: {
        method: regMethod.value,
      },
    });

    const redirectUrl = `${CLIENT_LOGIN_URL}/?token=${config.getToken()}`;

    spinner.succeed(`Your account has been successfully created. 
    
    To help you get started quickly, 
    we've developed a quick start that will guide you through setting up and testing Novu notifications with ease.
    
    In case the browser haven't opened automatically, you can access the quick start here:
    ${chalk.blue(redirectUrl)}
    `);

    httpServer.redirectSuccessDashboard(redirectUrl);

    await exitHandler();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    spinner?.fail('Something un-expected happened :(');
  } finally {
    spinner?.stop();
    httpServer.close();
  }
}

async function gitHubOAuth(httpServer: HttpServer, config: ConfigService): Promise<void> {
  const redirectUrl = `http://${SERVER_HOST}:${await getServerPort()}${REDIRECT_ROUTE}`;

  try {
    await open(`${API_OAUTH_URL}?&redirectUrl=${redirectUrl}&source=${SignUpOriginEnum.CLI}&distinctId=${anonymousId}`);

    const userJwt = await httpServer.redirectResponse();

    storeToken(config, userJwt);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

async function createOrganizationHandler(config: ConfigService, answers: Answers) {
  if (config.isOrganizationIdExist()) return;

  const createOrganizationResponse = await createOrganization(answers.environmentName);

  const newUserJwt = await switchOrganization(createOrganizationResponse._id);

  storeToken(config, newUserJwt);
}

async function createEnvironmentHandler(config: ConfigService, answers: Answers): Promise<string> {
  if (config.isEnvironmentIdExist()) {
    const existingEnvironment = await getEnvironmentMe();
    const keys = await getEnvironmentApiKeys();

    config.setValue('apiKey', keys[0]?.key);

    return existingEnvironment.identifier;
  }

  const createEnvironmentResponse = await createEnvironment(answers.environmentName);
  const newUserJwt = await switchEnvironment(createEnvironmentResponse._id);

  config.setValue('apiKey', createEnvironmentResponse.apiKeys[0].key);
  storeToken(config, newUserJwt);

  return createEnvironmentResponse.identifier;
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

async function checkExistingEnvironment(config: ConfigService): Promise<IEnvironment | null> {
  const isSessionExists = !!config.getDecodedToken();

  if (isSessionExists && process.env.NODE_ENV !== 'dev') {
    storeToken(config, config.getToken());

    let existingEnvironment: IEnvironment;

    try {
      existingEnvironment = await getEnvironmentMe();
      if (!existingEnvironment) {
        return null;
      }
    } catch (e) {
      await config.clearStore();

      return null;
    }

    return existingEnvironment;
  }

  return null;
}

async function handleExistingSession(result: string, config: ConfigService) {
  if (result === 'visitDashboard') {
    analytics.track({
      identity: { userId: config.getDecodedToken()._id },
      event: AnalyticsEventEnum.OPEN_DASHBOARD,
      data: {
        existingUser: true,
      },
    });

    const dashboardURL = `${CLIENT_LOGIN_URL}?token=${config.getToken()}&source=${SignUpOriginEnum.CLI}`;

    await open(dashboardURL);
  } else if (result === 'exit') {
    analytics.track({
      identity: { userId: config.getDecodedToken()._id },
      event: AnalyticsEventEnum.EXIT_EXISTING_SESSION,
    });
    await analytics.flush();
    process.exit();
  }
}

async function signUp(config: ConfigService) {
  let errorInSignup = true;
  const { fullName } = await prompt(fullNameQuestion);

  while (errorInSignup) {
    const { email } = await prompt(emailQuestion);

    if (privateEmailDomains.includes(email.split('@')[1])) {
      analytics.track({
        identity: { anonymousId },
        event: AnalyticsEventEnum.PRIVATE_EMAIL_ATTEMPT,
        data: {
          method: 'email',
        },
      });

      const { domain } = await prompt(privateDomainQuestions(email));

      if (domain === 'updateEmail') {
        errorInSignup = true;

        continue;
      }
    }

    const { password } = await prompt(passwordQuestion);
    try {
      const response = await signup({
        email,
        password,
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ')[1] || '',
        origin: SignUpOriginEnum.CLI,
      });

      storeToken(config, response.token);

      errorInSignup = false;
    } catch (e) {
      const error = e?.response?.data;

      if (error?.message === 'User already exists') {
        const { proceedSignup } = await prompt(proceedSignupQuestions);

        if (proceedSignup === 'resetPassword') {
          await open(`${CLIENT_LOGIN_URL.replace('/auth/login', '/auth/reset/request')}`);
          console.log('Finished flow');
          process.exit();
        } else {
          errorInSignup = true;
        }
      } else {
        errorInSignup = true;
        console.log(
          chalk.bold.red(
            Array.isArray(error?.message) ? error?.messag?.join('\n') : error?.message || 'Something went wrong'
          )
        );
      }
    }
  }
}
