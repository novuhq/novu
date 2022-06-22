import { faker } from '@faker-js/faker';
import { createHmac } from 'crypto';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-test-id=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelectorLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('openWidget', (settings = {}) => {
  return cy.get('#notification-bell').click();
});

Cypress.Commands.add('initializeShellSession', (subscriberId, identifier, encryptedHmacHash) => {
  cy.visit('http://localhost:4700/cypress/test-shell', { log: false });

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
          backendUrl: 'evilCorpApiUrl',
          socketUrl: 'evilCorpSocketUrl',
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
});

Cypress.Commands.add('initializeSession', function (settings = {}) {
  return cy
    .initializeOrganization()
    .then(function (session: any) {
      cy.log('Session created');
      cy.log(`Organization id: ${session.organization._id}`);
      cy.log(`App id: ${session.environment.identifier}`);
      cy.log(`Widget initialized: ${session.subscriberId}`);
    })
    .then((session: any) => {
      let encryptedHmacHash: string | undefined = undefined;

      if (settings.hmacEncryption) {
        cy.task('enableEnvironmentHmac', {
          environment: session.environment,
        });

        encryptedHmacHash = createHmacHash(session);
      }

      return settings?.shell
        ? cy
            .initializeShellSession(session.subscriberId, session.environment.identifier, encryptedHmacHash)
            .then((subscriber) => ({
              ...session,
              subscriber,
            }))
        : cy.initializeWidget({ session: session, encryptedHmacHash: encryptedHmacHash });
    });
});

Cypress.Commands.add('initializeWidget', ({ session, encryptedHmacHash }) => {
  const URL = `/${session.environment.identifier}`;
  return cy.visit(URL, { log: false }).then(() =>
    cy
      .window({ log: false })
      .its('initHandler', { log: false })
      .then(() => {
        return cy.window({ log: false }).then((w) => {
          const user = {
            subscriberId: session.subscriberId,
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email(),
            subscriberHash: encryptedHmacHash,
          };

          w.initHandler({
            data: {
              type: 'INIT_IFRAME',
              value: {
                clientId: session.environment.identifier,
                data: user,
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

Cypress.Commands.add('initializeOrganization', (settings = {}) => {
  return cy.task('getSession', settings, { log: false }).then((response: any) => {
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
  return createHmac('sha256', session.environment.apiKeys[0].key).update(session.subscriberId).digest('hex');
}
