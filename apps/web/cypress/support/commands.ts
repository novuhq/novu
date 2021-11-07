// load the global Cypress types
/// <reference types="cypress" />

import 'cypress-file-upload';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-test-id=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelectorLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('seed', () => {
  return cy.request('POST', `${Cypress.env('apiUrl')}/v1/testing/seed`, {});
});

Cypress.Commands.add('initializeSession', (settings = {}) => {
  return cy.task('getSession', settings).then((response: any) => {
    window.localStorage.setItem('auth_token', response.token);

    return response;
  });
});

Cypress.Commands.add('logout', (settings = {}) => {
  return window.localStorage.removeItem('auth_token');
});

export {};
