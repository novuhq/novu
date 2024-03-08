import { dragAndDrop, editChannel } from './notification-editor';
import { goBack } from './notification-editor';

describe('Changes Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display changes to promote ', function () {
    createNotification();

    cy.visit('/changes');
    cy.getByTestId('pending-changes-table').find('tbody tr').should('have.length', 1);
  });

  it.skip('fields should be disabled in Production', function () {
    createNotification();
    promoteNotification();

    switchEnvironment('Production');
    cy.location('pathname').should('equal', '/workflows');

    cy.getByTestId('create-workflow-btn').get('button').should('be.disabled');
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
    cy.getByTestId('change-type').contains('Workflow Change');
    cy.getByTestId('change-content').contains('Test Notification Title');
  });

  it('should show one change for status change and template update', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('title').first().clear().type('Updated Title');
    cy.getByTestId('sidebar-close').click();
    cy.getByTestId('notification-template-submit-btn').click();

    cy.getByTestId('side-nav-changes-count').contains('1');

    cy.getByTestId('settings-page').click();
    cy.getByTestId('active-toggle-switch').click({ force: true });
    cy.getByTestId('side-nav-changes-count').contains('1');

    promoteNotification();
    switchEnvironment('Production');
    cy.location('pathname').should('equal', '/workflows');

    cy.getByTestId('notifications-template').find('tbody tr').first().click({ force: true });

    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('title').first().should('have.value', 'Updated Title');

    cy.getByTestId('active-toggle-switch').get('label').contains('Inactive');
  });

  it('should show history of changes', function () {
    createNotification();
    promoteNotification();

    cy.getByTestId('pending-changes-table').find('tbody tr').should('not.exist');

    cy.get('.mantine-Tabs-tabsList').contains('History').click();

    cy.getByTestId('history-changes-table').find('tbody tr').should('have.length', 1);
    cy.getByTestId('promote-btn').should('be.disabled');
  });

  it.skip('should promote all changes with promote all btn 2', function () {
    cy.intercept('**/v1/changes?promoted=false&page=0&limit=10').as('changes');
    cy.intercept('**/v1/changes/bulk/apply').as('bulk-apply');
    cy.intercept('**/notification-templates**').as('notificationTemplates');

    createNotification();
    cy.waitForNetworkIdle(500);
    createNotification();
    cy.waitForNetworkIdle(1000);

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

    cy.waitForNetworkIdle(700);
    cy.awaitAttachedGetByTestId('pending-changes-table').find('tbody tr').should('not.exist');
  });
});

function switchEnvironment(environment: 'Production' | 'Development') {
  cy.getByTestId('environment-switch').find(`input[value="${environment}"]`).click({ force: true });
  cy.waitForNetworkIdle(500);
}

function createNotification() {
  cy.intercept('**/notification-groups').as('getNotificationGroups');
  cy.visit('/workflows/create');
  cy.waitForNetworkIdle(500);

  cy.getByTestId('name-input').clear().type('Test Notification Title');

  cy.getByTestId('settings-page').click();
  cy.waitForNetworkIdle(500);

  cy.getByTestId('description').clear().type('This is a test description for a test title');
  cy.get('body').click();

  goBack();

  dragAndDrop('email');
  cy.waitForNetworkIdle(500);

  editChannel('email');
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
