/// <reference types="cypress" />

type IMountType = import('cypress/react').mount;

declare namespace Cypress {
  interface Chainable {
    getByTestId(dataTestAttribute: string, args?: any): Chainable<JQuery<HTMLElement>>;
    mount: typeof IMountType;
  }
}
