describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/organizations/branding').as('updateBrandingSettings');
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: false });

    cy.waitLoadEnv(() => {
      cy.visit('/');
    });
  });

  it('should display the api key of the app', function () {
    cy.visit('/settings');
    cy.get('.mantine-Tabs-tabsList').contains('API Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.environment.apiKeys[0].key);
  });
});
