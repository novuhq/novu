import { dragAndDrop } from './notification-editor';
import { goBack } from './notification-editor/index';

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

  it('should promote all changes with promote all btn 2', function () {
    cy.intercept('**/v1/changes?promoted=false&page=0&limit=10').as('changes');
    cy.intercept('**/v1/changes/bulk/apply').as('bulk-apply');
    cy.intercept('**/notification-templates**').as('notificationTemplates');

    createNotification();
    cy.waitForNetworkIdle(500);
    createNotification();
    cy.waitForNetworkIdle(500);

    cy.waitLoadTemplatePage(() => {
      cy.visit('/changes');
      cy.waitForNetworkIdle(500);
      cy.wait(['@changes']);
      cy.awaitAttachedGetByTestId('pending-changes-table').find('tbody tr').should('have.length', 2);
      cy.wait(['@changes']);
      cy.intercept('**/v1/changes?promoted=false&page=0&limit=10').as('changes-2');
      cy.awaitAttachedGetByTestId('promote-all-btn').click({ force: true });
      cy.wait(['@bulk-apply']);
      cy.wait(['@changes-2']);
      cy.wait(['@changes-2']);

      cy.awaitAttachedGetByTestId('pending-changes-table').find('tbody tr').should('not.exist');

      switchEnvironment('Production');
      cy.waitForNetworkIdle(500);
    });

    cy.visit('/templates');
    cy.wait('@notificationTemplates');
    cy.awaitAttachedGetByTestId('notifications-template').find('tbody tr').should('have.length', 2);
  });
});

function switchEnvironment(environment: 'Production' | 'Development') {
  cy.getByTestId('environment-switch').find(`input[value="${environment}"]`).click({ force: true });
  cy.waitForNetworkIdle(500);
}

function createNotification() {
  cy.intercept('**/notification-groups').as('getNotificationGroups');
  cy.visit('/templates/create');
  cy.waitForNetworkIdle(500);

  cy.getByTestId('title').clear().type('Test Notification Title');

  cy.getByTestId('settings-page').click();
  cy.waitForNetworkIdle(500);

  cy.getByTestId('description').clear().type('This is a test description for a test title');
  cy.get('body').click();

  goBack();

  dragAndDrop('email');
  cy.waitForNetworkIdle(500);

  cy.clickWorkflowNode(`node-emailSelector`);
  cy.waitForNetworkIdle(500);

  cy.getByTestId('emailSubject').type('this is email subject');

  goBack();
  cy.getByTestId('notification-template-submit-btn').click();
}

function promoteNotification() {
  cy.visit('/changes');
  cy.getByTestId('promote-btn').eq(0).click({ force: true });
  cy.waitForNetworkIdle(500);
}
