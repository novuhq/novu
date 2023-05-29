describe('Just launch the app for exploration', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should launch the app', function () {
    cy.visit('/');
    cy.location('pathname').should('equal', '/workflows');
  });
});
