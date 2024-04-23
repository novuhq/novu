/// <reference types="cypress" />

type IMountType = import('cypress/react').mount;
type ICreateNotificationTemplateDto = import('@novu/shared').ICreateNotificationTemplateDto;
type FeatureFlagsKeysEnum = import('@novu/shared').FeatureFlagsKeysEnum;
type CreateTemplatePayload = import('@novu/testing').CreateTemplatePayload;

declare namespace Cypress {
  interface Chainable {
    getByTestId(dataTestAttribute: string, args?: any): Chainable<JQuery<HTMLElement>>;
    getBySelectorLike(dataTestPrefixAttribute: string, args?: any): Chainable<JQuery<HTMLElement>>;
    clickWorkflowNode(selector: string, last?: boolean): void | Chainable<JQuery<HTMLElement>> | Chainable<Element>;
    awaitAttachedGetByTestId(selector: string): Chainable<JQuery<HTMLElement>>;
    clickNodeButton(selector: string): void | Chainable<JQuery<HTMLElement>> | Chainable<Element>;
    waitLoadEnv(beforeWait: () => void): void;
    waitLoadTemplatePage(beforeWait: () => void): void;

    /**
     *  Window object with additional properties used during test.
     */
    window(options?: Partial<Loggable & Timeoutable>): Chainable<CustomWindow>;

    clear(): Chainable<any>;

    logout(): Chainable<any>;
    /**
     * Logs-in user by using UI
     */
    login(username: string, password: string): void;

    clearDatabase(): Chainable<any>;
    seedDatabase(): Chainable<any>;

    /**
     * Logs-in user by using API request
     */
    initializeSession(settings?: {
      noEnvironment?: boolean;
      disableLocalStorage?: boolean;
      showOnBoardingTour?: boolean;
      noTemplates?: boolean;
      partialTemplate?: Partial<ICreateNotificationTemplateDto>;
    }): Chainable<Response>;

    /**
     * Invites a user by given email
     */
    inviteUser(email: string): Chainable<Response>;

    /**
     * Intercept feature flags from LaunchDarkly and mock their response.
     *
     * Must be in beforeEach (vs before) because intercepts are cleared before each test run.
     */
    mockFeatureFlags(featureFlags: Partial<Record<FeatureFlagsKeysEnum, boolean>>): Chainable<void>;

    /**
     * Get the value from the clipboard. Must use `.then((value) => ...)` to access the value.
     *
     * NOTE: In order for this to work while running the Cypress UI, the Cypress browser
     * window must remain in focus. Otherwise, you'll see an exception: `Document is not focused`
     */
    getClipboardValue(): Chainable<string>;

    loginWithGitHub(): Chainable<any>;

    makeBlueprints(): Chainable<any>;

    createWorkflows(args: {
      userId: string;
      organizationId: string;
      environmentId: string;
      workflows: Partial<CreateTemplatePayload>[];
    }): Chainable<any>;

    mount: typeof IMountType;
  }
}
