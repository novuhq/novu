describe('Environment Switch Control', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display switch when page is loaded', function () {
    cy.visit('/templates');
  });
});
