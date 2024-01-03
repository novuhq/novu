import { faker } from '@faker-js/faker';
import { createHmac } from 'crypto';
import { IInitializeSessionSetting, IInitializeShellSessionSettings } from '../global';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-test-id=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelectorLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('openWidget', (settings = {}) => {
  return cy.get('#notification-bell').click();
});

Cypress.Commands.add(
  'initializeShellSession',
  ({ subscriberId, identifier, encryptedHmacHash, tabs, stores }: IInitializeShellSessionSettings) => {
    cy.visit('http://127.0.0.1:4700/cypress/test-shell', { log: false });

    return cy
      .window()
      .then((w) => {
        const subscriber = {
          subscriberId: subscriberId,
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
          email: faker.internet.email(),
          subscriberHash: encryptedHmacHash,
        };

        w.novu.init(
          identifier,
          {
            unseenBadgeSelector: '#unseen-badge-span',
            bellSelector: '#notification-bell',
            tabs: tabs,
            stores: stores,
          },
          subscriber
        );

        return subscriber;
      })
      .then(function (subscriber) {
        return cy
          .get('#novu-iframe-element')
          .its('0.contentDocument.body')
          .should('not.be.empty')
          .then((body) => {
            return cy
              .wrap(body)
              .window()
              .then((w) => w.localStorage.clear());
          })
          .then(function () {
            return subscriber;
          });
      });
  }
);

Cypress.Commands.add('initializeSession', function (settings = {} as IInitializeSessionSetting, templateOverride?) {
  return cy.initializeOrganization({}, templateOverride).then(function (session: any) {
    cy.log('Session created');
    cy.log(`Organization id: ${session?.organization?._id || undefined}`);
    cy.log(`App id: ${session?.environment?.identifier || undefined}`);
    cy.log(`Widget initialized: ${session?.subscriberId || undefined}`);

    let encryptedHmacHash: string | undefined;

    if (settings?.hmacEncryption) {
      cy.task('enableEnvironmentHmac', {
        environment: session?.environment,
      });

      encryptedHmacHash = createHmacHash(session);
    }

    return settings?.shell
      ? cy
          .initializeShellSession({
            subscriberId: session?.subscriberId,
            identifier: session?.environment?.identifier,
            encryptedHmacHash: encryptedHmacHash,
            tabs: settings?.tabs,
            stores: settings?.stores,
          })
          .then((subscriber) => ({
            ...session,
            subscriber,
          }))
      : cy.initializeWidget({
          session: session,
          encryptedHmacHash: encryptedHmacHash,
          theme: settings?.theme,
          i18n: settings?.i18n,
          preferenceFilter: settings?.preferenceFilter,
        });
  });
});

Cypress.Commands.add('initializeWidget', ({ session, encryptedHmacHash, theme, i18n, preferenceFilter }) => {
  const URL = `/${session?.environment?.identifier || undefined}`;
  return cy.visit(URL, { log: false }).then(() =>
    cy
      .window({ log: false })
      .its('initHandler', { log: false })
      .then(() => {
        return cy.window({ log: false }).then((w) => {
          const user = {
            subscriberId: session?.subscriberId,
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email(),
            subscriberHash: encryptedHmacHash,
          };

          w.initHandler({
            data: {
              type: 'INIT_IFRAME',
              value: {
                clientId: session?.environment?.identifier,
                data: user,
                theme,
                i18n,
                preferenceFilter,
              },
            },
          });

          return {
            ...session,
            subscriber: user,
          };
        });
      })
  );
});

Cypress.Commands.add('initializeOrganization', (settings = {}, templateOverride?) => {
  return cy.task('getSession', { settings, templateOverride }, { log: false }).then((response: any) => {
    const subscriberId = faker.datatype.uuid();

    return {
      subscriberId,
      ...response,
    };
  });
});

Cypress.Commands.add('forceVisit', (url: string) => {
  cy.window().then((win) => {
    return win.open(url, '_self');
  });
});

function createHmacHash(session: any) {
  return createHmac('sha256', session?.environment?.apiKeys[0]?.key).update(session?.subscriberId).digest('hex');
}
