// @ts-nocheck

Cypress.on('window:before:load', (win) => {
  win._cypress = {
    ...win._cypress,
    IS_MULTI_PROVIDER_CONFIGURATION_ENABLED: 'true',
  };
});

describe('Integrations List Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  const checkTableLoading = () => {
    cy.getByTestId('integration-name-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-provider-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-channel-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-environment-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-status-cell-loading').should('have.length', 10).first().should('be.visible');
  };

  const checkTableRow = (
    {
      name,
      isFree,
      provider,
      channel,
      environment,
      status,
    }: {
      name: string;
      isFree?: boolean;
      provider: string;
      channel: string;
      environment?: string;
      status: string;
    },
    nth: number
  ) => {
    cy.getByTestId('integrations-list-table').as('integrations-table');
    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-name-cell')
      .should('be.visible')
      .contains(name);

    if (isFree) {
      cy.get('@integrations-table')
        .get('tr')
        .eq(nth)
        .getByTestId('integration-name-cell')
        .should('be.visible')
        .contains('Free');
    }

    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-provider-cell')
      .should('be.visible')
      .contains(provider);

    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-channel-cell')
      .should('be.visible')
      .contains(channel);

    if (environment) {
      cy.get('@integrations-table')
        .get('tr')
        .eq(nth)
        .getByTestId('integration-environment-cell')
        .should('be.visible')
        .contains(environment);
    }

    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-status-cell')
      .should('be.visible')
      .contains(status);
  };

  it('should show the table loading skeleton and empty state', () => {
    cy.intercept('*/integrations', {
      data: [],
      delay: 1000,
    }).as('getIntegrations');

    cy.visit('/integrations');
    cy.location('pathname').should('equal', '/integrations');

    cy.getByTestId('add-provider').should('be.disabled').contains('Add a provider');
    checkTableLoading();

    cy.wait('@getIntegrations');

    cy.getByTestId('add-provider').should('be.enabled');
    cy.getByTestId('no-integrations-placeholder').should('be.visible');
    cy.contains('Choose a channel you want to start sending notifications');

    cy.getByTestId('integration-channel-card-in_app').should('be.enabled').contains('In-App');
    cy.getByTestId('integration-channel-card-email').should('be.enabled').contains('Email');
    cy.getByTestId('integration-channel-card-chat').should('be.enabled').contains('Chat');
    cy.getByTestId('integration-channel-card-push').should('be.enabled').contains('Push');
    cy.getByTestId('integration-channel-card-sms').should('be.enabled').contains('SMS');
  });

  it('should show the table loading skeleton and then table', function () {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');

    cy.visit('/integrations');
    cy.location('pathname').should('equal', '/integrations');

    cy.getByTestId('add-provider').should('be.disabled').contains('Add a provider');
    checkTableLoading();

    cy.wait('@getIntegrations');

    checkTableRow(
      {
        name: 'Novu Email',
        provider: 'Novu Email',
        channel: 'Email',
        status: 'Disabled',
      },
      0
    );
    checkTableRow(
      {
        name: 'Novu SMS',
        provider: 'Novu SMS',
        channel: 'SMS',
        status: 'Disabled',
      },
      1
    );
    checkTableRow(
      {
        name: 'SendGrid',
        provider: 'SendGrid',
        channel: 'Email',
        environment: 'Development',
        status: 'Active',
      },
      2
    );
    checkTableRow(
      {
        name: 'Twilio',
        provider: 'Twilio',
        channel: 'SMS',
        environment: 'Development',
        status: 'Active',
      },
      3
    );
    checkTableRow(
      {
        name: 'Slack',
        provider: 'Slack',
        channel: 'Chat',
        environment: 'Development',
        status: 'Active',
      },
      4
    );
    checkTableRow(
      {
        name: 'Discord',
        provider: 'Discord',
        channel: 'Chat',
        environment: 'Development',
        status: 'Active',
      },
      5
    );
    checkTableRow(
      {
        name: 'Firebase Cloud Messaging',
        provider: 'Firebase Cloud Messaging',
        channel: 'Push',
        environment: 'Development',
        status: 'Active',
      },
      6
    );
    checkTableRow(
      {
        name: 'Novu In-App',
        isFree: true,
        provider: 'Novu In-App',
        channel: 'In-App',
        environment: 'Development',
        status: 'Active',
      },
      7
    );
    checkTableRow(
      {
        name: 'SendGrid',
        provider: 'SendGrid',
        channel: 'Email',
        environment: 'Production',
        status: 'Active',
      },
      8
    );
    checkTableRow(
      {
        name: 'Twilio',
        provider: 'Twilio',
        channel: 'SMS',
        environment: 'Production',
        status: 'Active',
      },
      9
    );
    checkTableRow(
      {
        name: 'Slack',
        provider: 'Slack',
        channel: 'Chat',
        environment: 'Production',
        status: 'Active',
      },
      10
    );
    checkTableRow(
      {
        name: 'Discord',
        provider: 'Discord',
        channel: 'Chat',
        environment: 'Production',
        status: 'Active',
      },
      11
    );
    checkTableRow(
      {
        name: 'Firebase Cloud Messaging',
        provider: 'Firebase Cloud Messaging',
        channel: 'Push',
        environment: 'Production',
        status: 'Active',
      },
      12
    );
    checkTableRow(
      {
        name: 'Novu In-App',
        isFree: true,
        provider: 'Novu In-App',
        channel: 'In-App',
        environment: 'Production',
        status: 'Active',
      },
      13
    );
  });
});
