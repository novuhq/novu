describe('Digest Playground Workflow Page', function () {
  beforeEach(function () {
    cy.initializeSession({ noTemplates: true }).as('session');
  });

  it('should have a link to the docs', function () {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.get('a[href="https://docs.novu.co/platform/digest"]').contains('Learn more in docs');
  });

  it('the set up digest workflow should redirec to template edit page', function () {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.get('button').contains('Set Up Digest Workflow').click();

    cy.url().should('include', '/templates/edit');
  });
});
