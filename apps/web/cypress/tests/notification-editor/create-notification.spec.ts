import { addAndEditChannel, clickWorkflow, dragAndDrop, fillBasicNotificationDetails, goBack } from '.';

describe('Creation functionality', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should create in-app notification', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    cy.getByTestId('settings-page').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('title').clear().first().type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();
    cy.getByTestId('trigger-code-snippet').should('not.exist');
    cy.getByTestId('groupSelector').should('have.value', 'General');

    addAndEditChannel('inApp');
    cy.waitForNetworkIdle(500);

    cy.get('.ace_text-input').first().type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
      force: true,
    });
    cy.getByTestId('inAppRedirect').type('/example/test');

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

  it('should create multiline in-app notification, send it and receive', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });

    cy.getByTestId('settings-page').click();

    cy.getByTestId('title').first().clear().type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    cy.get('body').click();

    addAndEditChannel('inApp');
    cy.waitForNetworkIdle(500);

    // put the multiline notification message
    cy.get('.ace_text-input')
      .first()
      .type('{{firstName}} someone assigned you to {{taskName}}', {
        parseSpecialCharSequences: false,
        force: true,
      })
      .type('{enter}Please check it.', {
        force: true,
      });
    cy.getByTestId('inAppRedirect').type('/example/test');

    goBack();
    cy.getByTestId('notification-template-submit-btn').click();

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
        expect($el[0].innerText).to.contain('Please check it.');
      });
  });

  it('should manage variables', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
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
    cy.getByTestId('add-text-block').click();
    cy.getByTestId('editable-text-content').eq(1).clear().type('This another text will be {{customVariable}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('editable-text-content').eq(1).click();

    cy.getByTestId('settings-row-btn').eq(1).invoke('show').click();
    cy.getByTestId('remove-row-btn').click();
    cy.getByTestId('button-block-wrapper').should('not.exist');

    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('emailPreheader').type('this is email preheader');

    cy.getByTestId('var-label').first().contains('System Variables');
    cy.getByTestId('var-label').last().contains('Step Variables');
    cy.getByTestId('var-items-step').contains('step').contains('object');
    cy.getByTestId('var-items-branding').contains('branding');
    cy.getByTestId('var-items-subscriber').contains('subscriber');
    cy.getByTestId('var-item-firstName-string').contains('firstName').contains('string');
    cy.getByTestId('var-item-customVariable-string').contains('customVariable').contains('string');
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

  it('should create email notification', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
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
    cy.getByTestId('notification-template-submit-btn').click();
    cy.getByTestId('get-snippet-btn').click();
    cy.getByTestId('trigger-code-snippet').should('be.visible');
    cy.getByTestId('trigger-code-snippet').contains('test-notification-title');
    cy.getByTestId('trigger-code-snippet').contains('firstName:');
    cy.getByTestId('trigger-code-snippet').contains('customVariable:');
  });

  it('should add digest node', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });

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
    cy.waitForNetworkIdle(500);

    dragAndDrop('digest');
    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode('node-digestSelector');
    cy.waitForNetworkIdle(500);

    cy.getByTestId('time-unit-minutes').click();
    cy.getByTestId('time-amount').type('20');
    cy.getByTestId('batch-key').type('id');

    cy.getByTestId('digest-type').contains('Backoff').click();

    cy.getByTestId('backoff-amount').type('20');

    cy.getByTestId('backoff-unit-minutes').click();

    goBack();

    cy.clickWorkflowNode('node-digestSelector');

    cy.getByTestId('time-amount').should('have.value', '20');
    cy.getByTestId('batch-key').should('have.value', 'id');
    cy.getByTestId('backoff-amount').should('have.value', '20');
    cy.getByTestId('time-unit-minutes').should('be.checked');
    cy.getByTestId('digest-type').contains('Backoff').should('have.class', 'mantine-SegmentedControl-labelActive');
    cy.getByTestId('backoff-unit-minutes').should('be.checked');
  });

  it('should create and edit group id', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);
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

    cy.visit('/templates');
    cy.getByTestId('template-edit-link');
    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.getByTestId('settings-page').click();
    cy.getByTestId('groupSelector').should('have.value', 'New Test Category');
  });

  it('should show delay settings in side menu', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    fillBasicNotificationDetails('Test Added Delay');
    goBack();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('button-add').click();
    cy.getByTestId('add-delay-node').click();
    cy.clickWorkflowNode('node-delaySelector');
    cy.getByTestId('delay-type').should('be.visible');
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
