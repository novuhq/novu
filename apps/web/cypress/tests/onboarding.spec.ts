describe('Getting Started Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it.skip('should change status of templates in on-boarding', function () {
    cy.intercept('GET', '*/notification-templates', (r) => {
      r.continue((res) => {
        if (res.body) {
          const sessionTemplates = this.session.templates.map((template) => template._id);
          const createdTemplate = res.body.data.filter((template) => !sessionTemplates.includes(template._id));
          res.body.data = createdTemplate;
        }

        res.send({ body: res.body });
      });
    });
    cy.visit('/quickstart');
    cy.getByTestId('create-workflow-btn').should('exist').click({ force: true });

    cy.location('pathname').should('equal', '/workflows/create');
    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.getByTestId('notification-template-submit-btn').click({ force: true });
    cy.get('.mantine-Notification-root').contains('Template saved successfully');

    cy.getByTestId('side-nav-quickstart-link').click({ force: true });
    cy.getByTestId('create-workflow-btn').should('not.exist');
    cy.getByTestId('template-created').contains('Created');
  });
});
