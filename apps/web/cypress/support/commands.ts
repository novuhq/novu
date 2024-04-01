// load the global Cypress types
/// <reference types="cypress" />

import { MemberRoleEnum, MemberStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import 'cypress-wait-until';
import 'cypress-file-upload';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-test-id=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelectorLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('waitLoadEnv', (beforeWait: () => void): void => {
  cy.intercept('GET', '**/v1/environments').as('environments');
  cy.intercept('GET', '**/v1/environments/me').as('environments-me');

  beforeWait && beforeWait();

  cy.wait(['@environments', '@environments-me']);
});

Cypress.Commands.add('waitLoadTemplatePage', (beforeWait: () => void): void => {
  cy.intercept('GET', '**/v1/environments').as('environments');
  cy.intercept('GET', '**/v1/organizations').as('organizations');
  cy.intercept('GET', '**/v1/environments/me').as('environments-me');
  cy.intercept('GET', '**/v1/notification-groups').as('notification-groups');
  cy.intercept('GET', '**/v1/changes/count').as('changes-count');
  cy.intercept('GET', '**/v1/integrations/active').as('active-integrations');
  cy.intercept('GET', '**/v1/users/me').as('me');

  beforeWait && beforeWait();

  cy.wait([
    '@environments',
    '@organizations',
    '@environments-me',
    '@notification-groups',
    '@changes-count',
    '@active-integrations',
    '@me',
  ]);
});

Cypress.Commands.add('clickWorkflowNode', (selector: string, last?: boolean) => {
  if (last) {
    return cy.awaitAttachedGetByTestId(selector).last().click({ force: true });
  }

  return cy.awaitAttachedGetByTestId(selector).first().click({ force: true });
});

Cypress.Commands.add('awaitAttachedGetByTestId', (selector: string) => {
  return cy
    .waitUntil(
      () =>
        cy
          .getByTestId(selector)
          .as('awaitedElement')
          .wait(1) // for some reason this is needed, otherwise next line returns `true` even if click() fails due to detached element in the next step
          .then(($el) => {
            return Cypress.dom.isAttached($el);
          }),
      { timeout: 5000, interval: 500 }
    )
    .get('@awaitedElement');
});

Cypress.Commands.add('clickNodeButton', (selector: string) => {
  cy.awaitAttachedGetByTestId(selector).click({ force: true });
});

Cypress.Commands.add(
  'initializeSession',
  (
    settings: { disableLocalStorage?: boolean; noTemplates?: boolean; showOnBoardingTour?: boolean } = {
      disableLocalStorage: false,
    }
  ) => {
    return cy.task('getSession', settings).then((response: any) => {
      if (!settings.disableLocalStorage) {
        window.localStorage.setItem('auth_token', response.token);
      }

      return response;
    });
  }
);

Cypress.Commands.add('makeBlueprints', () => {
  return cy.task('makeBlueprints');
});

Cypress.Commands.add('inviteUser', (email: string) => {
  return cy
    .initializeSession()
    .then((session) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/v1/invites`,
        body: {
          email,
          role: MemberRoleEnum.ADMIN,
        },
        auth: {
          bearer: session.token,
        },
      });

      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/v1/organizations/members`,
        auth: {
          bearer: session.token,
        },
      })
        .then((response) => {
          const member = response.body.data.find((i) => i.memberStatus === MemberStatusEnum.INVITED);
          return member.invite.token;
        })
        .as('token');

      cy.then(() => session.user).as('inviter');

      cy.logout().then(() => {
        return session.organization;
      });
    })
    .as('organization');
});

Cypress.Commands.add('logout', (settings = {}) => {
  return window.localStorage.removeItem('auth_token');
});

Cypress.Commands.add('seedDatabase', () => {
  return cy.task('seedDatabase');
});

Cypress.Commands.add('clearDatabase', () => {
  return cy.task('clearDatabase');
});

Cypress.Commands.add('loginWithGitHub', () => {
  const gitHubUserEmail = Cypress.env('GITHUB_USER_EMAIL');
  const gitHubPassword = Cypress.env('GITHUB_USER_PASSWORD');

  cy.getByTestId('github-button').click();

  return cy.origin(
    'https://github.com',
    { args: { gitHubUserEmail, gitHubPassword } },
    ({ gitHubUserEmail, gitHubPassword }) => {
      cy.get('#login_field').type(gitHubUserEmail);
      cy.get('#password').type(gitHubPassword);
      cy.get('input[type="submit"]').click();

      cy.get('body').then(($body) => {
        if ($body.find('#js-oauth-authorize-btn').length) {
          cy.wait(2000).then(() => {
            $body.find('#js-oauth-authorize-btn').trigger('click');
          });
        }
      });
    }
  );
});

/**
 * Intercept feature flags from LaunchDarkly and mock their response.
 *
 * Must be in beforeEach (vs before) because intercepts are cleared before each test run.
 * https://medium.com/@kutnickclose/how-to-use-cypress-with-launchdarkly-897349b7f976
 */
Cypress.Commands.add('mockFeatureFlags', (featureFlags: Partial<Record<FeatureFlagsKeysEnum, boolean>>) => {
  // turn off push (EventSource) updates from LaunchDarkly
  cy.intercept({ hostname: /clientstream\.launchdarkly\.com/ }, (req) => {
    req.reply('data: no streaming feature flag data here\n\n', {
      'content-type': 'text/event-stream; charset=utf-8',
    });
  });

  // ignore api calls to events endpoint
  cy.intercept({ hostname: /events\.launchdarkly\.com/ }, { body: {} });

  // return feature flag values in format expected by launchdarkly client
  cy.intercept({ hostname: /app\.launchdarkly\.com/ }, (req) => {
    const body = {};
    Object.entries(featureFlags).forEach(([featureFlagName, featureFlagValue]) => {
      body[featureFlagName] = { value: featureFlagValue };
    });
    req.reply({ body });
  });
});

Cypress.Commands.add('createWorkflows', (args) => {
  return cy.task('createWorkflows', args);
});

/**
 * Get the value from the clipboard. Must use `.then((value) => ...)` to access the value.
 *
 * NOTE: In order for this to work while running the Cypress UI, the Cypress browser
 * window must remain in focus. Otherwise, you'll see an exception: `Document is not focused`
 */
Cypress.Commands.add('getClipboardValue', () => {
  return cy
    .window()
    .its('navigator.clipboard')
    .should('exist')
    .then((clipboard) => clipboard?.readText());
});

export {};
