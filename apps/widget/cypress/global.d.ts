/// <reference types="cypress" />

import { INovuThemeProvider, IStore, ITab, ITranslationEntry } from '@novu/notification-center';

declare namespace Cypress {
  interface Chainable {
    getByTestId(dataTestAttribute: string, args?: any): Chainable<Element>;

    getBySelectorLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;

    /**
     *  Window object with additional properties used during test.
     */
    window(options?: Partial<Loggable & Timeoutable>): Chainable<CustomWindow>;

    seed(): Chainable<any>;

    openWidget(): Chainable<any>;

    clear(): Chainable<any>;

    /**
     * Logs-in user by using UI
     */
    login(username: string, password: string): void;

    initializeOrganization(): Chainable<Response>;

    initializeShellSession(setting: IInitializeShellSessionSettings): Chainable<Response>;

    initializeWidget(setting: IInitializeWidgetSetting): Chainable<Response>;
    /**
     * Logs-in user by using API request
     */
    initializeSession(settings?: IInitializeSessionSetting): Chainable<Response>;

    logout(): Chainable<Response>;

    forceVisit(url: string): Chainable<Response>;
  }
}

interface IInitializeShellSessionSettings {
  subscriberId: string;
  identifier: string;
  encryptedHmacHash?: string;
}

interface IInitializeSessionSettings {
  noEnvironment?: boolean;
  shell?: boolean;
  hmacEncryption?: boolean;
  theme?: INovuThemeProvider;
  i18n?: ITranslationEntry;
  tabs?: ITab[];
  stores?: IStore[];
  preferenceFilter?: (userPreference: IUserPreferenceSettings) => boolean;
}

interface IInitializeWidgetSettings {
  session: any;
  shell?: boolean;
  encryptedHmacHash?: string;
  theme?: INovuThemeProvider;
  i18n?: ITranslationEntry;
}
