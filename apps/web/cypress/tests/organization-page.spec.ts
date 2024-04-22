describe('Organization Page', function () {
  beforeEach(function () {
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: true });
    cy.initializeSession().as('session');
    cy.visit('/settings/organization');
    cy.intercept('*/organizations').as('renameOrganization');
  });

  it('update the organization name', function () {
    cy.getByTestId('organization-name-input').should('have.value', this.session.organization.name);
    cy.getByTestId('organization-name-input').clear().type('New Name');
    cy.getByTestId('organization-update-button').click();

    cy.wait('@renameOrganization');

    cy.reload();
    cy.getByTestId('organization-name-input').should('have.value', 'New Name');
  });
});
