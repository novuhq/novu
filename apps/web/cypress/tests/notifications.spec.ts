describe('Notification Templates Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display notification templates list', function () {
    cy.visit('/workflows');
    cy.getByTestId('notifications-template')
      .find('tbody tr')
      .first()
      .getByTestId('template-edit-link')
      .then((a: any) => {
        const found = this.session.templates.find((i) => a.attr('href').includes(i._id));
        expect(found).to.be.ok;
        return expect(a.attr('href')).to.equal(`/workflows/edit/${found._id}`);
      });

    cy.getByTestId('notifications-template')
      .find('tbody tr')
      .first()
      .getByTestId('active-status-label')
      .should('be.visible');

    cy.getByTestId('create-workflow-btn').should('not.be.disabled');
    cy.getByTestId('category-label').contains('General');
  });

  it('should show the create template dropdown', function () {
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/workflows');
    cy.wait('@notificationTemplates');

    cy.getByTestId('create-workflow-btn').should('not.be.disabled').click();
    cy.getByTestId('create-workflow-all-templates').contains('All templates');
    cy.getByTestId('create-workflow-blank').contains('Blank workflow');
  });

  it('when no workflow templates created it should show the page placeholder', function () {
    cy.initializeSession({ noTemplates: true }).as('session');
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/workflows');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('create-workflow-tile').should('exist');
  });

  it('when clicking on create workflow it should redirect to create template page', function () {
    cy.initializeSession({ noTemplates: true }).as('session');
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/workflows');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('create-workflow-tile').should('exist');
    cy.getByTestId('create-workflow-tile').click();

    cy.url().should('include', '/workflows/create');
  });
});
