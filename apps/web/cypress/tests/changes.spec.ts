describe('Changes Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display changes to promote ', function () {
    createNotification();

    cy.visit('/changes');
    cy.getByTestId('pending-changes-table').find('tbody tr').should('have.length', 1);

    promoteNotification();
    createNotification();

    switchEnvironment('Production');
    cy.visit('/templates');

    cy.getByTestId('notifications-template').find('tbody tr').should('have.length', 1);
  });

  it('fields should be disabled in Production', function () {
    createNotification();
    promoteNotification();

    switchEnvironment('Production');
    cy.location('pathname').should('equal', '/templates');

    cy.getByTestId('create-template-btn').get('button').should('be.disabled');
    cy.getByTestId('notifications-template').find('tbody tr').first().click({ force: true });
  });

  it('should show correct count of pending changes and update real time', function () {
    createNotification();
    cy.getByTestId('side-nav-changes-count').contains('1');

    createNotification();
    cy.getByTestId('side-nav-changes-count').contains('2');

    promoteNotification();
    cy.getByTestId('side-nav-changes-count').contains('1');
  });

  it('should show correct type and description of change', function () {
    createNotification();
    cy.visit('/changes');
    cy.getByTestId('change-type').contains('Template Change');
    cy.getByTestId('change-content').contains('Test Notification Title');
  });

  it('should show history of changes', function () {
    createNotification();
    promoteNotification();

    cy.getByTestId('pending-changes-table').find('tbody tr').should('not.exist');

    cy.get('.mantine-Tabs-tabsList').contains('History').click();

    cy.getByTestId('history-changes-table').find('tbody tr').should('have.length', 1);
    cy.getByTestId('promote-btn').should('be.disabled');
  });

  it('should promote all changes with promote all btn', function () {
    createNotification();
    createNotification();

    cy.visit('/changes');
    cy.getByTestId('pending-changes-table').find('tbody tr').should('have.length', 2);

    cy.getByTestId('promote-all-btn').click({ force: true });

    cy.getByTestId('pending-changes-table').find('tbody tr').should('not.exist');

    switchEnvironment('Production');

    cy.visit('/templates');
    cy.getByTestId('notifications-template').find('tbody tr').should('have.length', 2);
  });
});

function switchEnvironment(environment: 'Production' | 'Development') {
  cy.getByTestId('environment-switch').find(`input[value="${environment}"]`).click({ force: true });
}

function createNotification() {
  const dataTransfer = new DataTransfer();

  cy.visit('/templates/create');

  cy.getByTestId('title').type('Test Notification Title');
  cy.getByTestId('description').type('This is a test description for a test title');
  cy.get('body').click();

  cy.getByTestId('workflowButton').click({ force: true });

  cy.waitLoadEnv(() => {
    cy.getByTestId('dnd-emailSelector').trigger('dragstart', { dataTransfer, force: true });

    cy.get('.react-flow__node-addNode').trigger('drop', { dataTransfer, force: true });

    cy.getByTestId('node-emailSelector').parent().click({ force: true });
    cy.getByTestId('edit-template-channel').click({ force: true });

    cy.getByTestId('emailSubject').type('this is email subject');

    cy.getByTestId('submit-btn').click();
    cy.getByTestId('trigger-snippet-btn').click();
  });
}

function promoteNotification() {
  cy.visit('/changes');
  cy.getByTestId('promote-btn').eq(0).click({ force: true });
}
