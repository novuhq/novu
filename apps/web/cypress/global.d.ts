/// <reference types="cypress" />

type IMountType = import('cypress/react').mount;
type ICreateNotificationTemplateDto = import('@novu/shared').ICreateNotificationTemplateDto;

declare namespace Cypress {
  interface Chainable {
    getByTestId(dataTestAttribute: string, args?: any): Chainable<Element>;
    getBySelectorLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;
    clickWorkflowNode(selector: string, last?: boolean): void | Chainable<JQuery<HTMLElement>> | Chainable<Element>;

    /**
     *  Window object with additional properties used during test.
     */
    window(options?: Partial<Loggable & Timeoutable>): Chainable<CustomWindow>;

    seed(): Chainable<any>;

    clear(): Chainable<any>;

    logout(): Chainable<any>;
    /**
     * Logs-in user by using UI
     */
    login(username: string, password: string): void;

    /**
     * Logs-in user by using API request
     */
    initializeSession(settings?: {
      noEnvironment?: boolean;
      disableLocalStorage?: boolean;
      partialTemplate?: Partial<ICreateNotificationTemplateDto>;
    }): Chainable<Response>;

    /**
     * Invites a user by given email
     */
    inviteUser(email: string): Chainable<Response>;

    mount: typeof IMountType;
  }
}
