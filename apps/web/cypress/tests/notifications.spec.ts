describe('Notification Templates Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display notification templates list', function () {
    cy.visit('/templates');
    cy.getByTestId('notifications-template')
      .find('tbody tr')
      .first()
      .getByTestId('template-edit-link')
      .then((a: any) => {
        const found = this.session.templates.find((i) => a.attr('href').includes(i._id));
        expect(found).to.be.ok;
        return expect(a.attr('href')).to.equal(`/templates/edit/${found._id}`);
      });

    cy.getByTestId('notifications-template')
      .find('tbody tr')
      .first()
      .getByTestId('active-status-label')
      .should('be.visible');

    cy.getByTestId('create-template-btn').should('not.be.disabled');
    cy.getByTestId('category-label').contains('General');
  });

  it('when no workflow templates created it should show the page placeholder', function () {
    cy.initializeSession({ noTemplates: true }).as('session');
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('create-workflow-tile').should('not.be.disabled');
    cy.getByTestId('try-digest-playground-tile').should('not.be.disabled');
  });

  it('when clicking on create workflow it should redirect to create template page', function () {
    cy.initializeSession({ noTemplates: true }).as('session');
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('create-workflow-tile').should('not.be.disabled');
    cy.getByTestId('create-workflow-tile').click();

    cy.url().should('include', '/templates/create');
  });

  it('when clicking on the try digest playground it should redirect to digest playground page', function () {
    cy.initializeSession({ noTemplates: true }).as('session');
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').should('not.be.disabled').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');
  });

  it('when clicking on the try digest playground it should create an example digest workflow', function () {
    cy.initializeSession({ noTemplates: true }).as('session');
    cy.intercept('**/notification-templates**').as('notificationTemplates');
    cy.visit('/templates');
    cy.wait('@notificationTemplates');

    cy.getByTestId('no-workflow-templates-placeholder').should('be.visible');
    cy.getByTestId('try-digest-playground-tile').click();

    cy.url().should('include', '/digest-playground');
    cy.contains('Digest Workflow Playground');

    cy.contains('Go Back').click();

    cy.url().should('include', '/templates');

    cy.getByTestId('notifications-template').get('tbody tr td').contains('Digest Workflow Example');
  });
});
