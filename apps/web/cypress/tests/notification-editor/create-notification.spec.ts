import { addAndEditChannel, clickWorkflow, dragAndDrop, goBack } from '.';

describe('Creation functionality', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should create in-app notification', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();
    cy.getByTestId('trigger-code-snippet').should('not.exist');
    cy.getByTestId('groupSelector').should('have.value', 'General');

    addAndEditChannel('inApp');

    cy.getByTestId('in-app-editor-content-input').type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('inAppRedirect').type('/example/test');
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('success-trigger-modal').should('be.visible');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('test-notification');
    cy.getByTestId('success-trigger-modal')
      .getByTestId('trigger-code-snippet')
      .contains("import { Novu } from '@novu/node'");

    cy.get('.mantine-Tabs-tabsList').contains('Curl').click();
    cy.getByTestId('success-trigger-modal')
      .getByTestId('trigger-curl-snippet')
      .contains("--header 'Authorization: ApiKey");

    cy.getByTestId('success-trigger-modal').getByTestId('trigger-curl-snippet').contains('taskName');

    cy.getByTestId('trigger-snippet-btn').click();
    cy.location('pathname').should('equal', '/templates');
  });

  it('should create multiline in-app notification, send it and receive', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });

    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('inApp');

    // put the multiline notification message
    cy.getByTestId('in-app-editor-content-input')
      .type('{{firstName}} someone assigned you to {{taskName}}', {
        parseSpecialCharSequences: false,
      })
      .type('{enter}Please check it.');
    cy.getByTestId('inAppRedirect').type('/example/test');
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('trigger-snippet-btn').click();

    // trigger the notification
    cy.task('createNotifications', {
      identifier: 'test-notification-title',
      token: this.session.token,
      subscriberId: this.session.user.id,
    });

    // click on the notifications bell
    cy.getByTestId('notification-bell').click();
    // check the notification
    cy.getByTestId('notifications-scroll-area')
      .getByTestId('notification-content')
      .first()
      .then(($el) => {
        expect($el[0].innerText).to.contain('\n');
        expect($el[0].innerText).to.contain('Please check it.');
      });
  });

  it('should create email notification', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('email');

    cy.getByTestId('email-editor').getByTestId('editor-row').click();
    cy.getByTestId('control-add').click();
    cy.getByTestId('add-btn-block').click();
    cy.getByTestId('button-block-wrapper').should('be.visible');
    cy.getByTestId('button-block-wrapper').find('button').click();
    cy.getByTestId('button-text-input').clear().type('Example Text Of {{ctaName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('button-block-wrapper').find('button').contains('Example Text Of {{ctaName}}');
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });

    cy.getByTestId('email-editor').getByTestId('editor-row').eq(1).click();
    cy.getByTestId('control-add').click();
    cy.getByTestId('add-text-block').click();
    cy.getByTestId('editable-text-content').eq(1).clear().type('This another text will be {{customVariable}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('editable-text-content').eq(1).click();

    cy.getByTestId('settings-row-btn').eq(1).invoke('show').click();
    cy.getByTestId('remove-row-btn').click();
    cy.getByTestId('button-block-wrapper').should('not.exist');

    cy.getByTestId('emailSubject').type('this is email subject');

    cy.getByTestId('submit-btn').click();

    cy.getByTestId('success-trigger-modal').should('be.visible');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('test-notification');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('firstName:');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('customVariable:');
  });

  it('should add digest node', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('email');

    cy.getByTestId('email-editor').getByTestId('editor-row').click();
    cy.getByTestId('control-add').click();
    cy.getByTestId('add-btn-block').click();
    cy.getByTestId('button-block-wrapper').should('be.visible');
    cy.getByTestId('button-block-wrapper').find('button').click();
    cy.getByTestId('button-text-input').clear().type('Example Text Of {{ctaName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('button-block-wrapper').find('button').contains('Example Text Of {{ctaName}}');
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });

    cy.getByTestId('email-editor').getByTestId('editor-row').eq(1).click();
    cy.getByTestId('control-add').click();
    cy.getByTestId('add-text-block').click();
    cy.getByTestId('editable-text-content').eq(1).clear().type('This another text will be {{customVariable}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('editable-text-content').eq(1).click();

    cy.getByTestId('settings-row-btn').eq(1).invoke('show').click();
    cy.getByTestId('remove-row-btn').click();
    cy.getByTestId('button-block-wrapper').should('not.exist');

    cy.getByTestId('emailSubject').type('this is email subject');

    goBack();

    dragAndDrop('digest');

    cy.clickWorkflowNode('node-digestSelector');

    cy.getByTestId('time-unit').click();
    cy.get('.mantine-Select-dropdown .mantine-Select-item').contains('Minutes').click();
    cy.getByTestId('time-amount').type('20');
    cy.getByTestId('batch-key').type('id');

    cy.getByTestId('digest-type').click();
    cy.get('.mantine-Select-dropdown .mantine-Select-item').contains('Backoff').click();

    cy.getByTestId('backoff-amount').type('20');

    cy.getByTestId('backoff-unit').click();
    cy.get('.mantine-Select-dropdown .mantine-Select-item').contains('Minutes').click();

    cy.getByTestId('submit-btn').click();
    cy.getByTestId('success-trigger-modal').should('be.visible');
    cy.getByTestId('trigger-snippet-btn').click();

    cy.intercept('GET', '/v1/notification-templates?page=0&limit=10').as('notification-templates');
    cy.visit('/templates');
    cy.wait('@notification-templates');

    awaitGetContains('tbody', 'Test Notification Title').click({ force: true });

    cy.waitLoadTemplatePage(() => {
      clickWorkflow();

      cy.clickWorkflowNode('node-digestSelector');

      cy.getByTestId('time-amount').should('have.value', '20');
      cy.getByTestId('batch-key').should('have.value', 'id');
      cy.getByTestId('backoff-amount').should('have.value', '20');
      cy.getByTestId('time-unit').should('have.value', 'Minutes');
      cy.getByTestId('digest-type').should('have.value', 'Backoff');
      cy.getByTestId('backoff-unit').should('have.value', 'Minutes');
      // cy.getByTestId('updateMode').should('be.checked');
    });
  });

  it('should create and edit group id', function () {
    const template = this.session.templates[0];
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/edit/' + template._id);
    });

    cy.getByTestId('groupSelector').click();
    cy.getByTestId('groupSelector').clear();
    cy.getByTestId('groupSelector').type('New Test Category');
    cy.getByTestId('submit-category-btn').click();
    cy.getByTestId('groupSelector').should('have.value', 'New Test Category');

    cy.getByTestId('submit-btn').click();

    cy.visit('/templates');
    cy.getByTestId('template-edit-link');
    cy.visit('/templates/edit/' + template._id);

    cy.getByTestId('groupSelector').should('have.value', 'New Test Category');
  });
});

function awaitGetContains(getSelector: string, contains: string) {
  return cy
    .waitUntil(
      () =>
        cy
          .get(getSelector)
          .contains(contains)
          .as('awaitedElement')
          .wait(1) // for some reason this is needed, otherwise next line returns `true` even if click() fails due to detached element in the next step
          .then(($el) => {
            return Cypress.dom.isAttached($el);
          }),
      { timeout: 5000, interval: 500 }
    )
    .get('@awaitedElement');
}
