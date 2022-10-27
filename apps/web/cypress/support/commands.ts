// load the global Cypress types
/// <reference types="cypress" />

import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-test-id=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelectorLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('clickWorkflowNode', (selector: string, last?: boolean) => {
  if (last) {
    return cy.getByTestId(selector).last().click({ force: true });
  }

  return cy.getByTestId(selector).click({ force: true });
});

Cypress.Commands.add(
  'initializeSession',
  (settings: { disableLocalStorage?: boolean } = { disableLocalStorage: false }) => {
    return cy.task('getSession', settings).then((response: any) => {
      if (!settings.disableLocalStorage) {
        window.localStorage.setItem('auth_token', response.token);
      }

      return response;
    });
  }
);

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

export {};
