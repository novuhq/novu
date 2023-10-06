// @ts-nocheck
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';

Cypress.on('window:before:load', (win) => {
  win._cypress = {
    ...win._cypress,
    IS_MULTI_PROVIDER_CONFIGURATION_ENABLED: 'false',
  };
});

describe.skip('Integration store page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  describe('In App', () => {
    it('should display in app card for connection', function () {
      cy.intercept('*/integrations', {
        data: [],
      });
      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      cy.getByTestId('integration-group-in-app')
        .getByTestId('integration-provider-card-novu')
        .eq(0)
        .get('[data-test-id="integration-provider-card-novu"] button')
        .contains('Connect');
    });

    it('should create integration on clicking connect', function () {
      cy.intercept('*/integrations', {
        data: [],
      });
      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      cy.intercept(
        { url: '*/integrations', method: 'post' },
        {
          data: {
            integrationId: 'test',
            createdAt: new Date().toISOString(),
            active: true,
            channel: ChannelTypeEnum.IN_APP,
            providerId: InAppProviderIdEnum.Novu,
          },
        }
      ).as('create-integration');

      cy.getByTestId('integration-group-in-app')
        .getByTestId('integration-provider-card-novu')
        .eq(0)
        .get('[data-test-id="integration-provider-card-novu"] button')
        .click();

      cy.wait('@create-integration');
      cy.contains('Select a framework');
    });

    it('should show guide on clicking connect', function () {
      cy.intercept('*/integrations', {
        data: [],
      });
      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      cy.intercept(
        { url: '*/integrations', method: 'post' },
        {
          data: {
            integrationId: 'test',
            createdAt: new Date().toISOString(),
            active: true,
            channel: ChannelTypeEnum.IN_APP,
            providerId: InAppProviderIdEnum.Novu,
          },
        }
      ).as('create-integration');

      cy.getByTestId('integration-group-in-app')
        .getByTestId('integration-provider-card-novu')
        .eq(0)
        .get('[data-test-id="integration-provider-card-novu"] button')
        .click();

      cy.wait('@create-integration');
      cy.contains('Select a framework');
      cy.getByTestId('in-app-select-framework-react').click();
      cy.contains('React integration guide');
      cy.contains('Configure Later').click();
      cy.contains('In-App notification center');
    });

    it('should display in app modal', function () {
      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      cy.getByTestId('integration-group-in-app').getByTestId('integration-provider-card-novu').eq(0).click();

      cy.getByTestId('connect-integration-form-active-text').contains('Active');
      cy.getByTestId('connect-integration-in-app-hmac-text').contains('Disabled');
      cy.getByTestId('connect-integration-in-app-hmac').click({ force: true });
      cy.getByTestId('connect-integration-in-app-hmac-text').contains('Active');

      cy.getByTestId('connect-integration-form-submit').click();
      cy.visit('/integrations');
      cy.getByTestId('integration-group-in-app').getByTestId('integration-provider-card-novu').eq(0).click();
      cy.getByTestId('connect-integration-form-active-text').contains('Active');
      cy.getByTestId('connect-integration-in-app-hmac-text').contains('Active');
    });
  });

  describe('Sendgrid', () => {
    it('should display email available for connection', function () {
      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      getFirstIntegrationCard().get('button').contains('Connect');
    });

    it('should display integrated sendgrid provider', function () {
      interceptSendgridIntegration(true);

      cy.visit('/integrations');

      getFirstIntegrationCard().getByTestId('card-status-bar-active').contains('Active');
    });

    it('should display not integrated sendgrid provider', function () {
      interceptSendgridIntegration(false);

      cy.visit('/integrations');

      getFirstIntegrationCard().getByTestId('card-status-bar-active').contains('Disabled');
    });

    it('should display use credentials on settings modal', function () {
      interceptSendgridIntegration(true);

      cy.visit('/integrations');

      getFirstIntegrationCard().getByTestId('provider-card-settings-svg').click();

      cy.getByTestId('apiKey').should('have.value', '123');
      cy.getByTestId('from').should('have.value', 'cypress');
    });
  });

  describe('Nodemailer', () => {
    it('should display email available for connection', function () {
      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      getFirstIntegrationCard().get('button').contains('Connect');
    });

    it('should display integrated nodemailer provider', function () {
      interceptNodemailerIntegration(true);

      cy.visit('/integrations');

      getFirstIntegrationCard().getByTestId('card-status-bar-active').contains('Active');
    });

    it('should display not integrated sendgrid provider', function () {
      interceptNodemailerIntegration(false);

      cy.visit('/integrations');

      getFirstIntegrationCard().getByTestId('card-status-bar-active').contains('Disabled');
    });

    it('should display use credentials on settings modal', function () {
      interceptNodemailerIntegration(true);

      cy.visit('/integrations');

      getFirstIntegrationCard().getByTestId('provider-card-settings-svg').click();

      cy.getByTestId('from').should('have.value', 'cypress-nodemailer');
      cy.getByTestId('senderName').should('have.value', 'cypress-novu');
      cy.getByTestId('host').should('have.value', 'localhost.novu.co');
    });
  });
});

function getFirstIntegrationCard() {
  return cy.getByTestId('integration-group-email').getByTestId('integration-provider-card-sendgrid').eq(0);
}

function interceptSendgridIntegration(isActive: boolean) {
  cy.intercept('*/integrations', {
    data: [
      {
        channel: ChannelTypeEnum.EMAIL,
        providerId: 'sendgrid',
        active: isActive,
        credentials: { apiKey: '123', from: 'cypress' },
      },
    ],
  });
}

function interceptNodemailerIntegration(isActive: boolean) {
  cy.intercept('*/integrations', {
    data: [
      {
        channel: ChannelTypeEnum.EMAIL,
        providerId: 'nodemailer',
        active: isActive,
        credentials: {
          from: 'cypress-nodemailer',
          senderName: 'cypress-novu',
          host: 'localhost.novu.co',
          port: 587,
          secure: true,
          requireTls: true,
          ignoreTls: false,
          tlsOptions: { requireUnauthorized: false },
        },
      },
    ],
  });
}
