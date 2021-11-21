describe('Initialization', function () {
  beforeEach(function () {
    cy.intercept('**/widgets/session/initialize**').as('sessionInitialize');
    cy.initializeSession();
  });

  it('should initialize a session', function () {
    cy.wait('@sessionInitialize');
    cy.window().then((w) => {
      expect(w.localStorage.getItem('widget_user_auth_token')).to.be.ok;
      return null;
    });
  });
});
