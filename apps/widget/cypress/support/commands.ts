import { faker } from '@faker-js/faker';

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-test-id=${selector}]`, ...args);
});

Cypress.Commands.add('getBySelectorLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('openWidget', (settings = {}) => {
  return cy.get('#notification-bell').click();
});

Cypress.Commands.add('initializeShellSession', (userId, identifier, settings = {}) => {
  cy.visit('http://localhost:4700/cypress/test-shell', { log: false });

  return cy
    .window()
    .then((w) => {
      const subscriber = {
        $user_id: userId,
        $first_name: faker.name.firstName(),
        $last_name: faker.name.lastName(),
        $email: faker.internet.email(),
      };

      w.novu.init(
        identifier,
        { unseenBadgeSelector: '#unseen-badge-span', bellSelector: '#notification-bell' },
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
      cy.log(`App id: ${session.application.identifier}`);
      cy.log(`Widget initialized: ${session.userId}`);
    })
    .then((session: any) => {
      return settings?.shell
        ? cy.initializeShellSession(session.userId, session.application.identifier).then((subscriber) => ({
            ...session,
            subscriber,
          }))
        : cy.initializeWidget(session, settings?.shell);
    });
});

Cypress.Commands.add('initializeWidget', (session, shell = false) => {
  const URL = `/${session.application.identifier}`;
  return cy.visit(URL, { log: false }).then(() =>
    cy
      .window({ log: false })
      .its('initHandler', { log: false })
      .then(() => {
        return cy.window({ log: false }).then((w) => {
          const user = {
            $user_id: session.userId,
            $first_name: faker.name.firstName(),
            $last_name: faker.name.lastName(),
            $email: faker.internet.email(),
          };

          w.initHandler({
            data: {
              type: 'INIT_IFRAME',
              value: {
                clientId: session.application.identifier,
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
    const userId = faker.random.uuid();

    return {
      userId,
      ...response,
    };
  });
});
