describe('Debugging - test trigger', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should open test trigger modal', function () {
    const template = this.session.templates[0];
    const userId = this.session.user.id;

    cy.intercept('GET', 'http://localhost:1336/v1/notification-templates/*').as('notification-templates');

    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/edit/' + template._id);
    });

    cy.wait('@notification-templates');

    cy.getByTestId('node-triggerSelector').click({ force: true });
    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper').getByTestId('test-trigger-to-param').contains(`"subscriberId": "${userId}"`);
  });

  it('should not test trigger on error ', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.getByTestId('node-triggerSelector').click({ force: true });

    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper').getByTestId('test-trigger-to-param').type('{backspace}');
    cy.getByTestId('step-page-wrapper').getByTestId('test-trigger-payload-param').click();
    cy.getByTestId('step-page-wrapper').getByTestId('test-trigger-btn').should('be.disabled');
    cy.getByTestId('step-page-wrapper').should('be.visible');
    cy.getByTestId('step-page-wrapper')
      .getByTestId('test-trigger-to-param')
      .should('have.class', 'mantine-JsonInput-invalid');
  });
});
