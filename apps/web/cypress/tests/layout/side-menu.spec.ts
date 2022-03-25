describe('Side Menu', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/');
  });

  it('should navigate correctly to notification-templates', function () {
    cy.getByTestId('side-nav-templates-link').should('have.attr', 'href').should('include', '/templates');
  });

  it('should navigate correctly to settings', function () {
    cy.getByTestId('side-nav-settings-link').should('have.attr', 'href').should('include', '/settings');
  });
});
