import { ChannelTypeEnum } from '@novu/shared';

describe('Integration store page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display email available for connection', function () {
    cy.visit('/integrations');
    cy.location('pathname').should('equal', '/integrations');

    getFirstIntegrationCard().get('button').contains('Connect');
  });

  it('should display integrated sendgrid provider', function () {
    interceptIntegration(true);

    cy.visit('/integrations');

    getFirstIntegrationCard().getByTestId('card-status-bar-active').contains('Active');

    getFirstIntegrationCard()
      .getByTestId('card-status-bar-active')
      .should(($div) => {
        const text = $div.text();

        expect(text).to.match(/^Active$/);
      });
  });

  it('should display not integrated sendgrid provider', function () {
    interceptIntegration(false);

    cy.visit('/integrations');

    getFirstIntegrationCard().getByTestId('card-status-bar-active').contains('Not Active');
  });

  it('should display use credentials on settings modal', function () {
    interceptIntegration(true);

    cy.visit('/integrations');

    getFirstIntegrationCard().getByTestId('provider-card-settings-svg').click();

    cy.getByTestId('apiKey').should('have.value', '123');
    cy.getByTestId('from').should('have.value', 'cypress');
  });
});

function getFirstIntegrationCard() {
  return cy.getByTestId('integration-group-email').getByTestId('integration-provider-card').eq(0);
}

function interceptIntegration(isActive: boolean) {
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
