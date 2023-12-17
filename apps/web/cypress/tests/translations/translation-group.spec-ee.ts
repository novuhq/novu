describe('Translations Group Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display translations group page', function () {
    cy.visit('/translations');

    cy.getByTestId('translations-title').should('have.text', 'Translations');
  });
});
