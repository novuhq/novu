describe('Settings Screen', function () {
  beforeEach(function () {
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: false });

    cy.initializeSession().as('session');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/organizations/branding').as('updateBrandingSettings');

    cy.waitLoadFeatureFlags(() => {
      cy.visit('/');
    });
    // avoid reloading the page (instead of visit('/settings') due to conditional routes behind the feature flag
    cy.contains('a', 'Settings').click();
  });

  it('should display the api key of the app', function () {
    cy.get('.mantine-Tabs-tabsList').contains('API Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.environment.apiKeys[0].key);
  });
});
