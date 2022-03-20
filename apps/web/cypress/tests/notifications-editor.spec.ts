import { ChannelTypeEnum, INotificationTemplate } from '@notifire/shared';

describe('Notifications Creator', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should not reset data when switching channel types', function () {
    cy.visit('/templates/create');
    cy.getByTestId('add-channel').click({ force: true });
    cy.getByTestId('inAppAddChannel').click({ force: true });
    cy.getByTestId('in-app-editor-content-input').type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('add-channel').click({ force: true });
    cy.getByTestId('emailAddChannel').click({ force: true });
    cy.getByTestId('editable-text-content').clear().type('This text is written from a test {{firstName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('emailSubject').type('this is email subject');

    cy.getByTestId('inAppSelector').click({ force: true });
    cy.getByTestId('in-app-editor-content-input').contains('someone assigned you to');

    cy.getByTestId('emailSelector').click({ force: true });
    cy.getByTestId('editable-text-content').contains('This text is written from a test');
    cy.getByTestId('emailSubject').should('have.value', 'this is email subject');
  });

  it('should create in-app notification', function () {
    cy.visit('/templates/create');
    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    // cy.getByTestId('tags').type('General {enter}');
    // cy.getByTestId('tags').type('Tasks {enter}');
    cy.get('body').click();
    cy.getByTestId('trigger-code-snippet').should('not.exist');
    cy.getByTestId('groupSelector').should('have.value', 'General');

    cy.getByTestId('add-channel').click({ force: true });
    cy.getByTestId('inAppAddChannel').click({ force: true });

    // cy.getByTestId('inAppSelector').click({ force: true });

    cy.getByTestId('in-app-editor-content-input').type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('inAppRedirect').type('/example/test');
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('success-trigger-modal').should('be.visible');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('test-notification');
    cy.getByTestId('success-trigger-modal')
      .getByTestId('trigger-code-snippet')
      .contains("import { Notifire } from '@notifire/node'");

    cy.get('.mantine-Tabs-tabsList').contains('Curl').click();
    cy.getByTestId('success-trigger-modal')
      .getByTestId('trigger-curl-snippet')
      .contains("--header 'Authorization: ApiKey");

    cy.getByTestId('success-trigger-modal').getByTestId('trigger-curl-snippet').contains('taskName');

    cy.getByTestId('trigger-snippet-btn').click();
    cy.location('pathname').should('equal', '/templates');
  });

  it.skip('should create email notification', function () {
    cy.visit('/templates/create');
    cy.getByTestId('title').type('Test Notification Title');
    cy.getByTestId('description').type('This is a test description for a test title');
    // cy.getByTestId('tags').type('General {enter}');
    // cy.getByTestId('tags').type('Tasks {enter}');
    cy.get('body').click();

    cy.getByTestId('add-channel').click({ force: true });
    cy.getByTestId('emailAddChannel').click({ force: true });

    cy.getByTestId('email-editor').getByTestId('editor-row').click();
    cy.getByTestId('control-add').click({ force: true });
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
    cy.getByTestId('control-add').click({ force: true });
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

  it.skip('should create and edit group id', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);

    cy.getByTestId('groupSelector').click();
    cy.getByTestId('category-text-input').type('New Test Category');
    cy.getByTestId('submit-category-btn').click();
    cy.getByTestId('groupSelector').contains('New Test Category');

    cy.getByTestId('submit-btn').click();

    cy.getByTestId('template-edit-link');
    cy.visit('/templates/edit/' + template._id);
    cy.getByTestId('groupSelector').contains('New Test Category');
  });

  it('should edit notification', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);
    cy.getByTestId('title').should('have.value', template.name);
    cy.getByTestId('inAppSelector').click({ force: true });

    cy.getByTestId('in-app-editor-content-input')
      .getByTestId('in-app-editor-content-input')
      .contains('Test content for {{firstName}}');

    cy.getByTestId('settingsButton').click({ force: true });
    cy.getByTestId('title').type(' This is the new notification title');

    cy.getByTestId('inAppSelector').click({ force: true });
    cy.getByTestId('in-app-editor-content-input').clear().type('new content for notification');
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('template-edit-link');
    cy.getByTestId('notifications-template').get('tbody tr td').contains('This is the new notification title', {
      matchCase: false,
    });
  });

  it.skip('should update notification active status', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);
    cy.getByTestId('active-toggle-switch').contains('Active');
    cy.getByTestId('active-toggle-switch').click();
    cy.getByTestId('active-toggle-switch').contains('Disabled');

    cy.visit('/templates/edit/' + template._id);
    cy.getByTestId('active-toggle-switch').contains('Disabled');
  });

  it.skip('should toggle active states of channels', function () {
    cy.visit('/templates/create');
    // Enable email from button click
    cy.getByTestId('emailSelector').click({ force: true });
    cy.getByTestId('emailSelector').find('.ant-switch-checked').should('exist');
    cy.getByTestId('emailSelector').find('.ant-switch').click({ force: true });

    // should hide when switch clicked
    cy.getByTestId('email-editor-wrapper').should('not.visible');

    // enable email selector
    cy.getByTestId('emailSelector').click();

    // enable in app without changing select item
    cy.getByTestId('inAppSelector').find('.ant-switch').click({ force: true });
    cy.getByTestId('inAppSelector').find('.ant-switch-checked').should('exist');
    cy.getByTestId('email-editor-wrapper').should('exist');

    // when hiding current selector, should navigate to closest available
    cy.getByTestId('emailSelector').find('.ant-switch').click({ force: true });
    cy.getByTestId('in-app-editor-wrapper').should('be.visible');
  });

  it.skip('should show trigger snippet block when editing', function () {
    const template = this.session.templates[0];
    cy.visit('/templates/edit/' + template._id);

    cy.getByTestId('trigger-code-snippet').contains('test-event');
  });

  it.skip('should handle multiple email messages', function () {
    cy.visit('/templates/create');
    cy.getByTestId('emailSelector').click({ force: true });
    cy.getByTestId('emailSubject').eq(1).should('not.exist');

    cy.getByTestId('add-message-button').click();
    cy.getByTestId('emailSubject').eq(1).click();
    cy.getByTestId('emailSubject').eq(1).should('be.visible');
    cy.getByTestId('emailSubject').eq(1).type('this is email subject 2');
    cy.getByTestId('emailSubject').eq(0).should('not.be.visible');
    cy.getByTestId('message-header-title').eq(0).click();
    cy.getByTestId('emailSubject').eq(0).should('be.visible');
    cy.getByTestId('emailSubject').eq(1).should('not.be.visible');
    cy.getByTestId('emailSubject').eq(0).type('this is email subject 1');
    cy.getByTestId('message-header-title').eq(1).find('.ant-typography-edit').click();
    cy.getByTestId('message-header-title').eq(1).find('textarea').type(' editing message name {enter}');
    cy.getByTestId('message-header-title').eq(1).contains('editing message name');

    cy.getByTestId('AddRule').eq(0).click();
    cy.getByTestId('filters-builder').eq(0).find('[title="Select your option"]').click();
    cy.get('.ant-select-item-option-content').contains('First Name').click();
    cy.getByTestId('filter-builder-row').find('input[type="text"]').type('First Value');

    cy.getByTestId('AddRule').eq(0).click();
    cy.getByTestId('filter-builder-row').eq(1).find('[title="Select your option"]').click();

    cy.getByTestId('remove-message-template-btn').eq(0).click();
    cy.get('.ant-popover-placement-bottom button').contains('Yes').click();

    cy.getByTestId('emailSubject').eq(1).should('not.exist');
    cy.getByTestId('emailSubject').should('have.value', 'this is email subject 2');
  });

  describe('Email Filters', function () {
    beforeEach(function () {
      cy.initializeSession({
        partialTemplate: {
          messages: [
            {
              type: ChannelTypeEnum.EMAIL,
              subject: 'Test',
              name: 'Test Name of message',
              content: [
                {
                  type: 'button',
                  content: 'Test button',
                },
              ],
              filters: [
                {
                  type: 'GROUP',
                  value: 'OR',
                  children: [
                    {
                      field: 'firstName',
                      value: 'Test',
                      operator: 'EQUAL',
                    },
                  ],
                },
              ],
            },
            {
              type: ChannelTypeEnum.EMAIL,
              subject: 'Test 2',
              name: 'Test Name of message 2',
              content: [
                {
                  type: 'button',
                  content: 'Test button 2',
                },
              ],
              filters: [
                {
                  type: 'GROUP',
                  value: 'OR',
                  children: [
                    {
                      field: 'firstName',
                      value: 'Test 2',
                      operator: 'EQUAL',
                    },
                  ],
                },
              ],
            },
          ],
        } as Partial<INotificationTemplate>,
      }).as('session');
    });

    it.skip('should prefill saved multiple email messages and filters', function () {
      const template = this.session.templates[0];
      cy.visit('/templates/edit/' + template._id);
      cy.getByTestId('message-header-title').eq(0).contains('Test Name of message');
      cy.getByTestId('message-header-title').eq(1).contains('Test Name of message 2');
      cy.getByTestId('filter-builder-row').eq(1).find('input[type=text]').should('have.value', 'Test 2');
      cy.getByTestId('filter-builder-row').eq(1).find('.ant-select-selection-item').contains('First Name');
    });
  });

  it.skip('should validate form inputs', function () {
    cy.visit('/templates/create');
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('title').should('have.class', 'ant-form-item-has-error');

    cy.getByTestId('inAppSelector').click({ force: true });
    cy.getByTestId('submit-btn').click();
    cy.getByTestId('in-app-content-form-item').should('have.class', 'ant-form-item-has-error');
  });

  it.skip('should allow uploading a logo from email editor', function () {
    cy.intercept(/.*applications\/me.*/, (r) => {
      r.continue((res) => {
        if (res.body) {
          delete res.body.data.branding.logo;
        }

        res.send({ body: res.body });
      });
    });
    cy.visit('/templates/create');
    cy.getByTestId('emailSelector').click({ force: true });

    cy.getByTestId('logo-upload-button').click();
    cy.get('.ant-popconfirm button').contains('Yes').click();
    cy.location('pathname').should('equal', '/settings/widget');
  });

  it.skip('should show the brand logo on main page', function () {
    cy.visit('/templates/create');
    cy.getByTestId('emailSelector').click({ force: true });

    cy.getByTestId('email-editor')
      .getByTestId('brand-logo')
      .should('have.attr', 'src', 'https://notifire.co/img/logo.png');
  });

  it.skip('should support RTL text content', function () {
    cy.visit('/templates/create');
    cy.getByTestId('emailSelector').click({ force: true });
    cy.getByTestId('settings-row-btn').eq(0).invoke('show').click();
    cy.getByTestId('editable-text-content').should('have.css', 'direction', 'ltr');
    cy.getByTestId('style-setting-row-btn-drawer').click();
    cy.getByTestId('text-direction-input').get('.ant-radio-button-wrapper').contains('RTL').click();
    cy.getByTestId('drawer-submit-btn').click();
    cy.getByTestId('editable-text-content').should('have.css', 'direction', 'rtl');
  });

  it.skip('should create an SMS channel message', function () {
    cy.visit('/templates/create');
    cy.getByTestId('title').type('Test SMS Notification Title');
    cy.getByTestId('description').type('This is a SMS test description for a test title');

    cy.getByTestId('smsSelector').click({ force: true });
    cy.getByTestId('smsNotificationContent').type('{{firstName}} someone assigned you to {{taskName}}', {
      parseSpecialCharSequences: false,
    });
    cy.getByTestId('submit-btn').click();

    cy.getByTestId('success-trigger-modal').should('be.visible');
    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('test-sms-notification');
    cy.getByTestId('success-trigger-modal')
      .getByTestId('trigger-code-snippet')
      .contains("import { Notifire } from '@notifire/node'");

    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('taskName');

    cy.getByTestId('success-trigger-modal').getByTestId('trigger-code-snippet').contains('firstName');

    cy.get('.ant-modal-footer .ant-btn.ant-btn-primary').click();
    cy.location('pathname').should('equal', '/templates');
  });

  it.skip('should prompt for filling sms settings before accessing the data', function () {
    cy.intercept(/.*applications\/me.*/, (r) => {
      r.continue((res) => {
        delete res.body.data.channels.sms;
        res.send({ body: res.body });
      });
    });

    cy.visit('/templates/create');
    cy.getByTestId('configure-sms-button').click();
    cy.get('.ant-popover button').contains('Yes').click();
    cy.url().should('include', '/settings/widget');
  });

  it.skip('should save HTML template email', function () {
    cy.visit('/templates/create');
    cy.getByTestId('title').type('Custom Code HTML Notification Title');
    cy.getByTestId('emailSelector').click({ force: true });
    cy.getByTestId('emailSubject').type('this is email subject');
    cy.getByTestId('editor-type-selector').find('label').contains('Custom Code', { matchCase: false }).click();
    cy.get('#codeEditor').type('Hello world code {{name}} <div>Test', { parseSpecialCharSequences: false });
    cy.getByTestId('submit-btn').click();
    cy.get('.ant-modal-footer .ant-btn.ant-btn-primary').click();
    cy.get('tbody').contains('Custom Code HTML Notification').parent('tr').find('button').click();
    cy.get('#codeEditor').contains('Hello world code {{name}} <div>Test</div>');
  });
});
