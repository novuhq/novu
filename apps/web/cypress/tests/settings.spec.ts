describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/settings');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/channels/sms/settings').as('updateSmsSettings');
    cy.intercept('*/organizations/branding').as('updateBrandingSettings');
  });

  it('should display the embed code successfully', function () {
    cy.get('.mantine-Tabs-tabsList').contains('In App Center').click();

    cy.getByTestId('embed-code-snippet').then(function (a) {
      expect(a).to.contain(this.session.environment.identifier);
      expect(a).to.contain('novu.init');
    });
  });

  it('should display the api key of the app', function () {
    cy.get('.mantine-Tabs-tabsList').contains('API Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.environment.apiKeys[0].key);
  });
});
