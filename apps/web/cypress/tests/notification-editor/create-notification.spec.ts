import { addAndEditChannel, clickWorkflow, dragAndDrop, editChannel, fillBasicNotificationDetails, goBack } from '.';

describe('Creation functionality', function () {
  beforeEach(function () {
    cy.initializeSession({ showOnBoardingTour: false }).as('session');
  });

  it('should create in-app notification', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);
    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('title').clear().first().type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();
    cy.getByTestId('trigger-code-snippet').should('not.exist');
    cy.getByTestId('groupSelector').should('have.value', 'General');

    addAndEditChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.get('.monaco-editor textarea:first', { timeout: 10000 })
      .parent()
      .click()
      .find('textarea')
      .type('<p>{{firstName}} someone assigned you to {{taskName}}</p>', {
        parseSpecialCharSequences: false,
        force: true,
      });
    cy.getByTestId('inAppRedirect').type('/example/test');
    cy.getByTestId('editor-mode-switch').find('label').last().click();
    cy.getByTestId('in-app-content-preview').contains('firstName someone assigned you to taskName', { timeout: 1000 });

    goBack();
    cy.getByTestId('notification-template-submit-btn').click();
    cy.getByTestId('get-snippet-btn').click();
    cy.getByTestId('trigger-code-snippet').should('be.visible');
    cy.getByTestId('trigger-code-snippet').contains('test-notification-title');
    cy.getByTestId('trigger-code-snippet').contains("import { Novu } from '@novu/node'");

    cy.get('.mantine-Tabs-tabsList').contains('Curl').click();
    cy.getByTestId('trigger-curl-snippet').contains("--header 'Authorization: ApiKey");
    cy.getByTestId('trigger-curl-snippet').contains('taskName');
  });

  it('should manage variables', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);
    cy.getByTestId('settings-page').click();
    cy.getByTestId('title').clear().first().type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('email');
    cy.waitForNetworkIdle(500);

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
    cy.getByTestId('add-text-block').click({ force: true });
    cy.getByTestId('editable-text-content').eq(1).clear().type('This another text will be {{customVariable}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('editable-text-content').eq(1).click();

    cy.getByTestId('settings-row-btn').eq(1).invoke('show').click();
    cy.getByTestId('remove-row-btn').click();
    cy.getByTestId('button-block-wrapper').should('not.exist');

    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('emailPreheader').type('this is email preheader');

    cy.getByTestId('var-label').first().contains('System Variables').click();
    cy.getByTestId('var-label').last().contains('Step Variables');
    cy.getByTestId('var-items-step').contains('step');
    cy.getByTestId('var-items-step').contains('object');
    cy.getByTestId('var-items-branding').contains('branding');
    cy.getByTestId('var-items-subscriber').contains('subscriber');
    cy.getByTestId('var-item-firstName-string').contains('firstName');
    cy.getByTestId('var-item-firstName-string').contains('string');
    cy.getByTestId('var-item-customVariable-string').contains('customVariable');
    cy.getByTestId('var-item-customVariable-string').contains('string');
    cy.getByTestId('var-items-subscriber').click();
    cy.getByTestId('var-item-phone-string').contains('string');

    cy.getByTestId('editor-mode-switch').find('label').eq(1).click();
    cy.getByTestId('preview-subject').contains('this is email subject');
    cy.getByTestId('preview-content')
      .invoke('attr', 'srcdoc')
      .then((value) => {
        expect(value).to.contain('This text is written from a test');
      });

    cy.getByTestId('preview-mode-switch').find('label').last().click();
    cy.getByTestId('preview-subject').contains('this is email subject');
    cy.getByTestId('preview-content')
      .invoke('attr', 'srcdoc')
      .then((value) => {
        expect(value).to.contain('This text is written from a test');
      });

    cy.getByTestId('preview-json-param').clear().type(`{
  "firstName": "Novu",
  "customVariable": "notCustomVariable"
}`);
    cy.getByTestId('apply-variables').click();

    cy.getByTestId('preview-content')
      .invoke('attr', 'srcdoc')
      .then((value) => {
        expect(value).to.contain('This text is written from a test Novu');
        expect(value).to.contain('This another text will be notCustomVariable');
      });

    cy.getByTestId('editor-mode-switch').find('label').last().click();

    cy.getByTestId('test-email-json-param').clear().type(`{
  "firstName": "Novu",
  "customVariable": "notCustomVariable"
}`);

    cy.getByTestId('test-send-email-btn').click();
    cy.get('.mantine-Notification-root').contains('Test sent successfully!');
  });

  it('should not clear the set default values of variables on update', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });

    cy.waitForNetworkIdle(500);

    dragAndDrop('email');
    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode('node-emailSelector');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('edit-action').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('email-editor').getByTestId('editor-row').click();
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });

    cy.getByTestId('open-edit-variables-btn').click();
    cy.getByTestId('variable-default-value').type('Test Var Value');
    cy.getByTestId('close-var-manager-modal').click();
    cy.getByTestId('notification-template-submit-btn').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('open-edit-variables-btn').click();
    cy.getByTestId('variable-default-value').should('have.value', 'Test Var Value');
    cy.getByTestId('close-var-manager-modal').click();
    goBack();
    dragAndDrop('sms');
    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode('node-smsSelector');
    cy.getByTestId('edit-action').click();
    cy.waitForNetworkIdle(500);

    cy.get('.monaco-editor textarea:first', { timeout: 7000 })
      .parent()
      .click()
      .find('textarea')
      .type('This text is written from a test {{var}}', {
        parseSpecialCharSequences: false,
        force: true,
      });
    cy.getByTestId('open-variable-management').click();
    cy.getByTestId('open-edit-variables-btn').click();
    cy.getByTestId('variable-default-value').type('Test');
    cy.getByTestId('close-var-manager-modal').click();

    cy.getByTestId('notification-template-submit-btn').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('open-variable-management').click();
    cy.getByTestId('open-edit-variables-btn').click();
    cy.getByTestId('variable-default-value').should('have.value', 'Test');
  });

  it('should not throw error for using array variable with index greater than 0', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);

    dragAndDrop('email');
    cy.waitForNetworkIdle(500);

    editChannel('email');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('email-editor').getByTestId('editor-row').click();
    cy.getByTestId('editable-text-content').clear().type('This tests array var {{array.[1].name}}', {
      parseSpecialCharSequences: false,
    });

    cy.getByTestId('var-items-array').contains('array');
    cy.getByTestId('var-items-array').contains('object');
  });

  it('should create email notification', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);

    cy.getByTestId('settings-page').click();

    cy.getByTestId('title').first().clear().type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('email');
    cy.waitForNetworkIdle(500);

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
    cy.getByTestId('add-text-block').click({ force: true });
    cy.getByTestId('editable-text-content').eq(1).clear().type('This another text will be {{customVariable}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('editable-text-content').eq(1).click();

    cy.getByTestId('settings-row-btn').eq(1).invoke('show').click();
    cy.getByTestId('remove-row-btn').click();
    cy.getByTestId('button-block-wrapper').should('not.exist');

    cy.getByTestId('emailSubject').type('this is email subject');

    goBack();
    cy.getByTestId('notification-template-submit-btn').click();
    cy.getByTestId('node-emailSelector')
      .getByTestId('workflow-node-subtitle')
      .should('contain.text', 'This text is written from a test {{firstName}}');
    cy.getByTestId('get-snippet-btn').click();
    cy.getByTestId('trigger-code-snippet').should('be.visible');
    cy.getByTestId('trigger-code-snippet').contains('test-notification-title');
    cy.getByTestId('trigger-code-snippet').contains('firstName:');
    cy.getByTestId('trigger-code-snippet').contains('customVariable:');
  });

  it('should not reset action steps values on update', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);

    dragAndDrop('digest');

    cy.clickWorkflowNode('node-digestSelector');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('digest-send-options').click();
    cy.getByTestId('time-amount').clear().type('30');
    cy.getByTestId('time-unit').click();
    cy.get('.mantine-Select-item').contains('sec (s)').click();

    cy.getByTestId('digest-group-by-options').click();

    cy.getByTestId('batch-key').type('id');

    cy.getByTestId('digest-send-options').click();

    cy.clickWorkflowNode('node-digestSelector');
    cy.getByTestId('notification-template-submit-btn').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('digest-send-options').click();

    cy.getByTestId('time-amount').should('have.value', '30');
    cy.getByTestId('batch-key').should('have.value', 'id');
    cy.getByTestId('time-unit').should('have.value', 'sec (s)');
  });

  it('should add digest node', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);

    cy.getByTestId('settings-page').click();
    cy.getByTestId('title').first().clear().type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('email');
    cy.waitForNetworkIdle(500);

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
    cy.getByTestId('add-text-block').click({ force: true });
    cy.getByTestId('editable-text-content').eq(1).clear().type('This another text will be {{customVariable}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('editable-text-content').eq(1).click();

    cy.getByTestId('settings-row-btn').eq(1).invoke('show').click();
    cy.getByTestId('remove-row-btn').click();
    cy.getByTestId('button-block-wrapper').should('not.exist');

    cy.getByTestId('emailSubject').type('this is email subject');

    goBack();
    cy.waitForNetworkIdle(500);

    dragAndDrop('digest');
    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode('node-digestSelector');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('digest-send-options').click();
    cy.getByTestId('time-amount').clear().type('20');
    cy.getByTestId('time-unit').click();
    cy.get('.mantine-Select-item').contains('min (s)').click();

    cy.getByTestId('digest-group-by-options').click();

    cy.getByTestId('batch-key').type('id');

    cy.getByTestId('digest-send-options').click();

    cy.getByTestId('backoff-switch').click({
      force: true,
    });

    cy.getByTestId('backoff-amount').clear().type('20');

    cy.getByTestId('time-unit-backoff').click();
    cy.get('.mantine-Select-item').contains('min (s)').click();

    goBack();

    cy.clickWorkflowNode('node-digestSelector');

    cy.getByTestId('digest-send-options').click();

    cy.getByTestId('time-amount').should('have.value', '20');
    cy.getByTestId('batch-key').should('have.value', 'id');
    cy.getByTestId('backoff-amount').should('have.value', '20');
    cy.getByTestId('time-unit').should('have.value', 'min (s)');
    cy.getByTestId('time-unit-backoff').should('have.value', 'min (s)');
    cy.getByTestId('node-digestSelector')
      .getByTestId('workflow-node-subtitle')
      .should('contain.text', 'after 20 minutes');
  });

  it('should create and edit group id', function () {
    const template = this.session.templates[0];
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('groupSelector').click();
    cy.getByTestId('groupSelector').clear();
    cy.getByTestId('groupSelector').type('New Test Category');
    cy.getByTestId('submit-category-btn').click();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('groupSelector').should('have.value', 'New Test Category');

    goBack();
    cy.getByTestId('notification-template-submit-btn').click();
    cy.waitForNetworkIdle(500);

    cy.visit('/workflows');
    cy.getByTestId('template-edit-link');
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.getByTestId('settings-page').click();
    cy.getByTestId('groupSelector').should('have.value', 'New Test Category');
  });

  it('should show delay settings in side menu', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    fillBasicNotificationDetails('Test Added Delay');
    goBack();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('button-add').click();
    cy.getByTestId('add-delay-node').click();
    cy.clickWorkflowNode('node-delaySelector');
    cy.getByTestId('delay-type').should('be.visible');
  });

  it('should be able to add huge amount of nodes.', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);

    fillBasicNotificationDetails('Test 15 Nodes');
    goBack();
    cy.waitForNetworkIdle(500);

    for (let i = 0; i < 15; i++) {
      cy.getByTestId('button-add').last().click({ force: true });
      cy.getByTestId('add-email-node').click();
    }

    editChannel('email', true);

    cy.waitForNetworkIdle(500);
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('emailPreheader').type('this is email preheader');
    cy.waitForNetworkIdle(500);
    goBack();
    cy.waitForNetworkIdle(500);

    cy.getByTestId('node-emailSelector').should('have.length', 15);

    editChannel('email', true);
    cy.waitForNetworkIdle(500);

    cy.getByTestId('editable-text-content').contains('This text is written from a test');
    cy.getByTestId('emailSubject').should('have.value', 'this is email subject');
    cy.getByTestId('emailPreheader').should('have.value', 'this is email preheader');
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
