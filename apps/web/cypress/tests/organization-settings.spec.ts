describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/team');
  });

  it('should send organization invitation', function () {
    cy.getByTestId('invite-email-field').type('test-user@email.com');
    cy.getByTestId('submit-btn').click();
  });
});
