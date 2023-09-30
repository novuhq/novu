describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/settings');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/organizations/branding').as('updateBrandingSettings');
  });

  it('should display the api key of the app', function () {
    cy.get('.mantine-Tabs-tabsList').contains('API Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.environment.apiKeys[0].key);
  });
});
