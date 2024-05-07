describe('Debugging - test trigger', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should open test trigger modal', function () {
    const template = this.session.templates[0];
    const userId = this.session.user.id;

    cy.intercept('GET', '/v1/notification-templates/*').as('notification-templates');

    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/edit/' + template._id);
    });

    cy.wait('@notification-templates');

    cy.getByTestId('node-triggerSelector').click({ force: true });
    cy.getByTestId('workflow-sidebar').should('be.visible');
    cy.getByTestId('workflow-sidebar').getByTestId('test-trigger-to-param').contains(`"subscriberId": "${userId}"`);
  });

  it('should not test trigger on error ', function () {
    const template = this.session.templates[0];
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.getByTestId('node-triggerSelector').click({ force: true });

    cy.getByTestId('workflow-sidebar').should('be.visible');
    cy.getByTestId('workflow-sidebar').getByTestId('test-trigger-to-param').type('{backspace}');
    cy.getByTestId('workflow-sidebar').getByTestId('test-trigger-payload-param').click();
    cy.getByTestId('workflow-sidebar').getByTestId('test-trigger-btn').should('be.disabled');
    cy.getByTestId('workflow-sidebar').should('be.visible');
    cy.getByTestId('workflow-sidebar')
      .getByTestId('test-trigger-to-param')
      .should('have.class', 'mantine-JsonInput-invalid');
  });
});
