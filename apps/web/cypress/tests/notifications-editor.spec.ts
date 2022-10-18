describe('Notifications Creator', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  describe('workflow editor - drag and drop', function () {
    it('should drag and drop channel', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test drag and drop channel');
      clickWorkflow();
      dragAndDrop('inApp');
      dragAndDrop('inApp');

      cy.getByTestId('node-inAppSelector').last().parent().click();
      cy.getByTestId('edit-template-channel').click();
    });

    it('should drag and drop channel in middle of workflow', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test drag and drop channel');
      clickWorkflow();
      dragAndDrop('inApp');
      dragAndDrop('sms');
      dragAndDrop('inApp', 'node-smsSelector');

      cy.getByTestId('node-inAppSelector')
        .last()
        .parent()
        .parent()
        .then(($parent) => {
          cy.getByTestId('node-inAppSelector')
            .last()
            .parent()
            .then(($child) => {
              cy.wrap({ index: [...Array.from($parent[0].children)].indexOf($child[0]) })
                .its('index')
                .should('eq', 1);
            });
        });
    });

    it('should not be able to drop when not on last node', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test only drop on last node');
      clickWorkflow();
      dragAndDrop('inApp');
      dragAndDrop('email');
      cy.getByTestId('node-emailSelector').should('not.exist');
      cy.get('.react-flow__node').should('have.length', 3);
    });

    it('should be able to select a step', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });
      fillBasicNotificationDetails('Test SMS Notification Title');
      clickWorkflow();
      cy.clickWorkflowNode(`node-inAppSelector`)?.parent().should('have.class', 'selected');
      cy.getByTestId(`step-properties-side-menu`).should('be.visible');
      cy.clickWorkflowNode(`node-triggerSelector`);
      cy.getByTestId(`drag-side-menu`).should('be.visible');
      cy.getByTestId(`node-inAppSelector`).parent().should('not.have.class', 'selected');
    });

    it('should add a step with plus button', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test Plus Button');
      clickWorkflow();
      cy.getByTestId('button-add').click();
      cy.getByTestId('add-sms-node').click();
      cy.get('.react-flow__node').should('have.length', 3);
      cy.get('.react-flow__node').first().should('contain', 'Trigger').next().should('contain', 'SMS');
    });
  });

  describe('workflow editor - main functionality', function () {
    it('should not reset data when switching channel types', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test not reset data when switching channel types');

      addAndEditChannel('inApp');
      cy.getByTestId('in-app-editor-content-input').type('{{firstName}} someone assigned you to {{taskName}}', {
        parseSpecialCharSequences: false,
      });
      goBack();

      dragAndDrop('email');
      editChannel('email');
      cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
        parseSpecialCharSequences: false,
      });
      cy.getByTestId('emailSubject').type('this is email subject');
      goBack();

      editChannel('inApp');
      cy.getByTestId('in-app-editor-content-input').contains('someone assigned you to');
      goBack();
      editChannel('email');

      cy.getByTestId('editable-text-content').contains('This text is written from a test');
      cy.getByTestId('emailSubject').should('have.value', 'this is email subject');
    });

    it('should create in-app notification', function () {
      waitLoadTemplatePage(() => {
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
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      cy.waitForNetworkIdle(1000);
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
      cy.waitForNetworkIdle(1000);

      cy.getByTestId('trigger-snippet-btn').click();

      cy.waitForNetworkIdle(1000);

      // trigger the notification
      cy.task('createNotifications', {
        identifier: 'test-notification-title',
        token: this.session.token,
        subscriberId: this.session.user.id,
      });
      cy.waitForNetworkIdle(1000);

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
      waitLoadTemplatePage(() => {
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
      waitLoadTemplatePage(() => {
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

      cy.clickWorkflowNode(`node-digestSelector`);

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
      cy.get('tbody').contains('Test Notification Title').click();

      clickWorkflow();

      cy.clickWorkflowNode(`node-digestSelector`);

      cy.getByTestId('time-amount').should('have.value', '20');
      cy.getByTestId('batch-key').should('have.value', 'id');
      cy.getByTestId('backoff-amount').should('have.value', '20');
      cy.getByTestId('time-unit').should('have.value', 'Minutes');
      cy.getByTestId('digest-type').should('have.value', 'Backoff');
      cy.getByTestId('backoff-unit').should('have.value', 'Minutes');
      // cy.getByTestId('updateMode').should('be.checked');
    });

    it('should create and edit group id', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });

      cy.getByTestId('groupSelector').click();
      cy.getByTestId('groupSelector').clear();
      cy.getByTestId('groupSelector').type('New Test Category');
      cy.getByTestId('submit-category-btn').click();
      cy.getByTestId('groupSelector').should('have.value', 'New Test Category');

      cy.wait(500);

      cy.getByTestId('submit-btn').click();

      cy.visit('/templates');
      cy.getByTestId('template-edit-link');
      cy.visit('/templates/edit/' + template._id);

      cy.getByTestId('groupSelector').should('have.value', 'New Test Category');
    });

    it('should edit notification', function () {
      const template = this.session.templates[0];
      cy.visit('/templates/edit/' + template._id);
      cy.waitForNetworkIdle(500);

      cy.getByTestId('title').should('have.value', template.name);

      addAndEditChannel('inApp');

      cy.getByTestId('in-app-editor-content-input')
        .getByTestId('in-app-editor-content-input')
        .contains('Test content for {{firstName}}');

      goBack();

      cy.getByTestId('settingsButton').click();
      cy.getByTestId('title').clear().type('This is the new notification title');
      clickWorkflow();

      editChannel('inApp', true);

      cy.getByTestId('use-feeds-checkbox').click();
      cy.getByTestId('feed-button-1').click({ force: true });

      cy.getByTestId('in-app-editor-content-input').clear().type('new content for notification');
      cy.getByTestId('submit-btn').click();

      cy.waitForNetworkIdle(500);
      cy.visit('/templates');
      cy.getByTestId('template-edit-link');
      cy.getByTestId('notifications-template').get('tbody tr td').contains('This is the new', {
        matchCase: false,
      });
      cy.visit('/templates/edit/' + template._id);
      cy.waitForNetworkIdle(500);

      clickWorkflow();
      editChannel('inApp', true);

      cy.getByTestId('feed-button-1-checked');
      cy.getByTestId('create-feed-input').type('test4');
      cy.getByTestId('add-feed-button').click();
      cy.wait(1000);
      cy.getByTestId('feed-button-2-checked');
    });

    it('should update notification active status', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });
      cy.getByTestId('active-toggle-switch').get('label').contains('Enabled');
      cy.getByTestId('active-toggle-switch').click();
      cy.getByTestId('active-toggle-switch').get('label').contains('Disabled');

      cy.visit('/templates/edit/' + template._id);
      cy.getByTestId('active-toggle-switch').get('label').contains('Disabled');
    });

    it('should toggle active states of channels', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test toggle active states of channels');
      // Enable email from button click
      clickWorkflow();
      dragAndDrop('email');

      cy.clickWorkflowNode(`node-emailSelector`);

      cy.get('.mantine-Switch-input').should('have.value', 'on');
      cy.get('.mantine-Switch-input').click();

      // enable email selector
      cy.get('.mantine-Switch-input').click();
      cy.getByTestId(`close-side-menu-btn`).click();

      dragAndDrop('inApp');

      cy.clickWorkflowNode(`node-inAppSelector`);
      cy.get('.mantine-Switch-input').should('have.value', 'on');
    });

    it('should show trigger snippet block when editing', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });

      cy.getByTestId('triggerCodeSelector').click();
      cy.getByTestId('trigger-code-snippet').contains('test-event');
    });

    it('should validate form inputs', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      cy.getByTestId('description').type('this is a notification template description');
      cy.getByTestId('submit-btn').click();
      cy.getByTestId('title').should('have.class', 'mantine-TextInput-invalid');
      fillBasicNotificationDetails('Test SMS Notification Title');
      clickWorkflow();
      dragAndDrop('inApp');

      cy.getByTestId('submit-btn').click();
      cy.getByTestId('workflowButton').getByTestId('error-circle').should('be.visible');
      cy.getByTestId('settingsButton').getByTestId('error-circle').should('be.visible');
    });

    it('should show error on node if message field is missing ', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails();
      clickWorkflow();
      dragAndDrop('email');
      cy.getByTestId('submit-btn').click();
      cy.getByTestId('node-emailSelector').getByTestId('error-circle').should('be.visible');
      editChannel('email');
      cy.getByTestId('emailSubject').should('have.class', 'mantine-TextInput-invalid');

      cy.getByTestId('emailSubject').type('this is email subject');
      goBack();
      cy.getByTestId('node-emailSelector').getByTestId('error-circle').should('not.exist');
    });

    it('should fill required settings before workflow btn is clickable', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      cy.getByTestId('description').type('this is a notification template description');
      clickWorkflow();
      cy.getByTestId('title').should('have.class', 'mantine-TextInput-invalid');
      cy.getByTestId('title').type('filled title');
      clickWorkflow();

      cy.wait(200);
      cy.get('.react-flow__node').should('exist');
    });

    it('should allow uploading a logo from email editor', function () {
      cy.intercept('*/organizations', (r) => {
        r.continue((res) => {
          if (res.body) {
            delete res.body.data[0].branding.logo;
          }

          res.send({ body: res.body });
        });
      });
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test allow uploading a logo from email editor');
      addAndEditChannel('email');

      cy.getByTestId('logo-upload-button').click();

      cy.get('.mantine-Modal-modal button').contains('Yes').click();
      cy.location('pathname').should('equal', '/settings');
    });

    it('should show the brand logo on main page', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test show the brand logo on main page');
      addAndEditChannel('email');

      cy.getByTestId('email-editor')
        .getByTestId('brand-logo')
        .should('have.attr', 'src', 'https://novu.co/img/logo.png');
    });

    it('should support RTL text content', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test support RTL text content');
      clickWorkflow();
      dragAndDrop('email');
      editChannel('email');

      cy.getByTestId('settings-row-btn').eq(0).invoke('show').click();
      cy.getByTestId('editable-text-content').should('have.css', 'text-align', 'left');
      cy.getByTestId('align-right-btn').click();
      cy.getByTestId('editable-text-content').should('have.css', 'text-align', 'right');
    });

    it('should create an SMS channel message', function () {
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });
      fillBasicNotificationDetails('Test SMS Notification Title');
      addAndEditChannel('sms');

      cy.getByTestId('smsNotificationContent').type('{{firstName}} someone assigned you to {{taskName}}', {
        parseSpecialCharSequences: false,
      });
      cy.getByTestId('submit-btn').click();

      cy.getByTestId('success-trigger-modal').should('be.visible');
      cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('test-sms-notification');
      cy.getByTestId('success-trigger-modal')
        .getByTestId('trigger-code-snippet')
        .contains("import { Novu } from '@novu/node'");

      cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('taskName');

      cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('firstName');

      cy.getByTestId('trigger-snippet-btn').click();
      cy.location('pathname').should('equal', '/templates');
    });

    it('should save HTML template email', function () {
      cy.visit('/templates/create');
      cy.waitForNetworkIdle(500);

      fillBasicNotificationDetails('Custom Code HTML Notification Title');
      addAndEditChannel('email');

      cy.getByTestId('emailSubject').type('this is email subject');

      cy.getByTestId('editor-type-selector')
        .find('.mantine-Tabs-tabControl')
        .contains('Custom Code', { matchCase: false })
        .click();
      cy.get('#codeEditor').type('Hello world code {{name}} <div>Test', { parseSpecialCharSequences: false });
      cy.intercept('GET', '/v1/notification-templates?page=0&limit=10').as('notification-templates');
      cy.getByTestId('submit-btn').click();
      cy.waitForNetworkIdle(500);
      cy.getByTestId('trigger-snippet-btn').click();

      cy.wait('@notification-templates', { timeout: 60000 });
      cy.get('tbody').contains('Custom Code HTM').click();

      cy.waitForNetworkIdle(500);

      clickWorkflow();
      editChannel('email');
      cy.get('#codeEditor').contains('Hello world code {{name}} <div>Test</div>');
    });

    it('should redirect to dev env for edit template', async function () {
      cy.intercept('POST', '*/notification-templates').as('createTemplate');
      waitLoadTemplatePage(() => {
        cy.visit('/templates/create');
      });

      fillBasicNotificationDetails();
      cy.getByTestId('submit-btn').click();

      cy.wait('@createTemplate').then((res) => {
        cy.getByTestId('trigger-snippet-btn').click();
        cy.intercept('GET', '/v1/changes?promoted=false').as('unpromoted-changes');
        cy.visit('/changes');
        cy.wait('@unpromoted-changes');
        cy.getByTestId('promote-btn').eq(0).click();

        cy.getByTestId('environment-switch').find(`input[value="Production"]`).click();

        cy.getByTestId('notifications-template').find('tbody tr').first().click();

        cy.location('pathname').should('not.equal', `/templates/edit/${res.response?.body.data._id}`);

        cy.getByTestId('environment-switch').find(`input[value="Development"]`).click();

        cy.location('pathname').should('equal', `/templates/edit/${res.response?.body.data._id}`);
      });
    });

    it('should be able to delete a step', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });

      clickWorkflow();
      cy.get('.react-flow__node').should('have.length', 4);
      cy.getByTestId('step-actions-dropdown').first().click().getByTestId('delete-step-action').click();
      cy.get('.mantine-Modal-modal button').contains('Yes').click();
      cy.getByTestId(`node-inAppSelector`).should('not.exist');
      cy.get('.react-flow__node').should('have.length', 3);
      cy.get('.react-flow__node').first().should('contain', 'Trigger').next().should('contain', 'Email');
      cy.getByTestId('submit-btn').click();
      cy.visit('/templates/edit/' + template._id);

      waitLoadEnv(() => {
        clickWorkflow();
      });
      cy.get('.react-flow__node').should('have.length', 3);
    });

    it('should show add step in sidebar after delete', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });

      clickWorkflow();
      cy.get('.react-flow__node').should('have.length', 4);
      cy.getByTestId('step-actions-dropdown').first().click().getByTestId('delete-step-action').click();
      cy.get('.mantine-Modal-modal button').contains('Yes').click();
      cy.getByTestId(`node-inAppSelector`).should('not.exist');
      cy.get('.react-flow__node').should('have.length', 3);
      cy.getByTestId('drag-side-menu').contains('Steps to add');
    });

    it('should keep steps order on reload', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });
      clickWorkflow();
      dragAndDrop('sms');

      editChannel('sms');
      cy.getByTestId('smsNotificationContent').type('new content for sms');
      cy.getByTestId('submit-btn').click();
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });
      clickWorkflow();
      cy.get('.react-flow__node').should('have.length', 5);
      cy.get('.react-flow__node')
        .first()
        .should('contain', 'Trigger')
        .next()
        .should('contain', 'In-App')
        .next()
        .should('contain', 'Email')
        .next()
        .should('contain', 'SMS');
    });

    it('should be able to disable step', function () {
      const template = this.session.templates[0];
      waitLoadTemplatePage(() => {
        cy.visit('/templates/edit/' + template._id);
      });
      clickWorkflow();
      cy.clickWorkflowNode(`node-inAppSelector`);
      cy.getByTestId(`step-properties-side-menu`).find('.mantine-Switch-input').get('label').contains('Step is active');
      cy.getByTestId(`step-properties-side-menu`).find('.mantine-Switch-input').click();
      cy.getByTestId('submit-btn').click();
      cy.clickWorkflowNode(`node-inAppSelector`);
      cy.getByTestId(`step-properties-side-menu`)
        .find('.mantine-Switch-input')
        .get('label')
        .contains('Step is not active');
    });
  });
});

type Channel = 'inApp' | 'email' | 'sms' | 'digest';

function addAndEditChannel(channel: Channel) {
  clickWorkflow();

  dragAndDrop(channel);
  editChannel(channel);
}

function dragAndDrop(channel: Channel, dropTestId = 'addNodeButton') {
  const dataTransfer = new DataTransfer();

  cy.wait(1000);
  cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
  cy.getByTestId(dropTestId).parent().trigger('drop', { dataTransfer });
}

function editChannel(channel: Channel, last = false) {
  cy.clickWorkflowNode(`node-${channel}Selector`, last);
  cy.getByTestId('edit-template-channel').click();
}

function goBack() {
  cy.getByTestId('go-back-button').click();
}

function fillBasicNotificationDetails(title?: string) {
  cy.waitForNetworkIdle(100);
  cy.getByTestId('title')
    .type(title || 'Test Notification Title')
    .blur();
  cy.getByTestId('description').type('This is a test description for a test title').blur();
  cy.wait(100);
}

function waitLoadEnv(beforeWait: () => void) {
  cy.intercept('GET', 'http://localhost:1336/v1/environments').as('environments');
  cy.intercept('GET', 'http://localhost:1336/v1/environments/me').as('environments-me');

  beforeWait();

  cy.wait(['@environments', '@environments-me']);
}

function waitLoadTemplatePage(beforeWait = (): string[] | void => []) {
  cy.intercept('GET', 'http://localhost:1336/v1/environments').as('environments');
  cy.intercept('GET', 'http://localhost:1336/v1/environments/me').as('environments-me');
  cy.intercept('GET', 'http://localhost:1336/v1/notification-groups').as('notification-groups');
  cy.intercept('GET', 'http://localhost:1336/v1/changes/count').as('changes-count');
  cy.intercept('GET', 'http://localhost:1336/v1/integrations/active').as('active-integrations');
  cy.intercept('GET', 'http://localhost:1336/v1/users/me').as('me');

  const waits = beforeWait();

  cy.wait([
    '@environments',
    '@environments-me',
    '@notification-groups',
    '@changes-count',
    '@active-integrations',
    '@me',
    ...(Array.isArray(waits) ? waits : []),
  ]);
}

function clickWorkflow() {
  cy.getByTestId('workflowButton').click();
  cy.wait(1000);
}
