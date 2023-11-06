import { Channel, dragAndDrop, editChannel, fillBasicNotificationDetails, goBack } from '.';

const EDITOR_TEXT = 'Hello, world!';
const VARIANT_EDITOR_TEXT = 'Hello, world from Variant!';
const SUBJECT_LINE = 'Novu test';
const PUSH_TITLE = 'Push test';

describe('Workflow Editor - Variants', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  const createWorkflow = (title: string) => {
    cy.intercept('GET', '**/notification-templates/**').as('getWorkflow');
    cy.intercept('PUT', '**/notification-templates/**').as('updateWorkflow');
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.wait('@getWorkflow');
    cy.getByTestId('title').first().clear().type(title).blur();
  };

  const fillInAppEditorContentWith = (text: string) => {
    cy.get('.ace_text-input').first().clear({ force: true }).type(text, {
      parseSpecialCharSequences: false,
      force: true,
    });
  };

  const fillEmailEditorContentWith = (subjectLine: string, content: string) => {
    cy.getByTestId('emailSubject').clear().type(subjectLine, {
      parseSpecialCharSequences: false,
      force: true,
    });
    cy.getByTestId('editable-text-content').clear().type(content, {
      parseSpecialCharSequences: false,
    });
  };

  const fillSmsEditorContentWith = (content: string) => {
    cy.getByTestId('smsNotificationContent').clear().type(content, {
      parseSpecialCharSequences: false,
      force: true,
    });
  };

  const fillChatEditorContentWith = (content: string) => {
    cy.getByTestId('chatNotificationContent').clear().type(content, {
      parseSpecialCharSequences: false,
      force: true,
    });
  };

  const fillPushEditorContentWith = (title: string, content: string) => {
    cy.getByTestId('pushNotificationTitle').clear().type(title, {
      parseSpecialCharSequences: false,
      force: true,
    });
    cy.getByTestId('pushNotificationContent').clear().type(content, {
      parseSpecialCharSequences: false,
      force: true,
    });
  };

  const showStepActions = (channel: Channel) => {
    cy.getByTestId(`node-${channel}Selector`).parent().trigger('mouseover');
  };

  const addVariantActionClick = (channel: Channel) => {
    cy.getByTestId(`node-${channel}Selector`)
      .getByTestId('step-actions-menu')
      .click()
      .getByTestId('add-variant-action')
      .click();
  };

  const addConditions = () => {
    cy.getByTestId('add-new-condition').click();
    cy.getByTestId('conditions-form-key').last().type('test');
    cy.getByTestId('conditions-form-value').last().type('test');
    cy.getByTestId('apply-conditions-btn').click();
  };

  const checkTheVariantsList = (title: string, content: string) => {
    cy.getByTestId('variants-list-sidebar').should('be.visible');
    cy.getByTestId(`variant-item-card-0`).contains(title);
    cy.getByTestId(`variant-item-card-0`).contains(content);
    cy.getByTestId(`variant-item-card-0`).getByTestId('conditions-action').contains('1');
    cy.getByTestId(`variant-root-card`).should('be.visible');
  };

  const fillEditorContent = (channel: Channel, isVariant = false) => {
    switch (channel) {
      case 'inApp':
        fillInAppEditorContentWith(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'email':
        fillEmailEditorContentWith(SUBJECT_LINE, isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'sms':
        fillSmsEditorContentWith(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'chat':
        fillChatEditorContentWith(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'push':
        fillPushEditorContentWith(PUSH_TITLE, isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
    }
  };

  const checkEditorContent = (channel: Channel, isVariant = false) => {
    switch (channel) {
      case 'inApp':
        cy.get('#codeEditor')
          .first()
          .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'email':
        cy.getByTestId('emailSubject').should('have.value', SUBJECT_LINE);
        cy.getByTestId('email-editor').contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'sms':
        cy.getByTestId('smsNotificationContent').should('have.value', isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'chat':
        cy.getByTestId('chatNotificationContent').should('have.value', isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'push':
        cy.getByTestId('pushNotificationTitle').should('have.value', PUSH_TITLE);
        cy.getByTestId('pushNotificationContent').should('have.value', isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
    }
  };

  const addVariantForChannel = (channel: Channel, variantName: string) => {
    createWorkflow(`Test Add Variant Flow for ${channel}`);

    // drag and edit the channel
    dragAndDrop(channel);
    editChannel(channel);

    // fill the editor content
    fillEditorContent(channel);
    goBack();

    // add the variant
    showStepActions(channel);
    addVariantActionClick(channel);

    // add conditions for the variant
    addConditions();

    // should land in the editor and has the root step content shown
    checkEditorContent(channel);
    fillEditorContent(channel, true);
    cy.getByTestId('notification-template-submit-btn').click();
    cy.wait('@updateWorkflow');
    goBack();

    // should have the variant shown in the list
    checkTheVariantsList(variantName, VARIANT_EDITOR_TEXT);

    cy.reload();

    // should successfully save the variants
    checkTheVariantsList(variantName, VARIANT_EDITOR_TEXT);
    goBack();

    cy.getByTestId(`node-${channel}Selector`).getByTestId('variants-count').contains('1 variant');
  };

  const checkStepActions = (channel: Channel) => {
    showStepActions(channel);
    cy.getByTestId('step-actions').should('be.visible');
    cy.getByTestId('add-conditions-action').should('be.visible');
    cy.getByTestId('edit-action').should('be.visible');
    cy.getByTestId('step-actions-menu').should('be.visible').click();
    cy.getByTestId('step-actions-menu').getByTestId('add-variant-action').should('be.visible');
    cy.getByTestId('step-actions-menu').getByTestId('delete-step-action').should('be.visible');
  };

  const checkEditorActions = (isVariant = false) => {
    if (!isVariant) {
      cy.getByTestId('editor-sidebar-add-variant').should('be.visible');
      cy.getByTestId('editor-sidebar-add-conditions').should('be.visible');
    } else {
      cy.getByTestId('editor-sidebar-edit-conditions').should('be.visible');
    }
    cy.getByTestId('editor-sidebar-delete').should('be.visible');
  };

  describe('Add variant flow', function () {
    it('should allow creating the variants for the in-app channel', function () {
      addVariantForChannel('inApp', 'V1 In-App');
    });

    it('should allow creating the variants for the email channel', function () {
      addVariantForChannel('email', 'V1 Email');
    });

    it('should allow creating the variants for the sms channel', function () {
      addVariantForChannel('sms', 'V1 SMS');
    });

    it('should allow creating the variants for the chat channel', function () {
      addVariantForChannel('chat', 'V1 Chat');
    });

    it('should allow creating the variants for the push channel', function () {
      addVariantForChannel('push', 'V1 Push');
    });

    it('should allow creating variant from the step editor', function () {
      createWorkflow('Add variant flow from variant editor');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');

      cy.getByTestId('editor-sidebar-add-variant').should('be.visible').click();
      addConditions();
      fillEditorContent('inApp', true);
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      checkEditorContent('inApp', true);
    });
  });

  describe('Step actions', function () {
    it('should show the step actions', function () {
      createWorkflow(`Test Step Actions`);

      dragAndDrop('inApp');

      checkStepActions('inApp');
    });

    it('should show the root step actions', function () {
      createWorkflow(`Test Root Step Actions`);

      // create in-app channel and add variant
      dragAndDrop('inApp');
      showStepActions('inApp');
      addVariantActionClick('inApp');
      addConditions();
      goBack();
      goBack();

      // show the root step actions and check available actions
      checkStepActions('inApp');
    });
  });

  describe('Editor actions', function () {
    it('check the step editor actions', function () {
      createWorkflow('Test Editor Actions');

      dragAndDrop('email');
      editChannel('email');

      checkEditorActions();
    });

    it('check the variant editor actions', function () {
      createWorkflow('Test Editor Actions');

      dragAndDrop('email');
      showStepActions('email');
      addVariantActionClick('email');
      addConditions();

      checkEditorActions(true);
    });
  });

  describe('Add conditions action', function () {
    it('should allow adding the conditions on the step', function () {
      createWorkflow('Test Conditions Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      cy.getByTestId('add-conditions-action').should('be.visible').click();
      addConditions();

      cy.getByTestId(`node-inAppSelector`).getByTestId('conditions-action').should('be.visible').contains('1');
      showStepActions('inApp');
      cy.getByTestId(`node-inAppSelector`).getByTestId('add-conditions-action').should('be.visible').contains('1');
    });

    it('should allow adding the conditions from the variants list sidebar header', function () {
      createWorkflow('Test Conditions Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      addVariantActionClick('inApp');
      addConditions();
      goBack();

      cy.getByTestId('variants-list-sidebar').getByTestId('editor-sidebar-add-conditions').should('be.visible').click();
      addConditions();

      cy.getByTestId('variants-list-sidebar')
        .getByTestId('editor-sidebar-edit-conditions')
        .should('be.visible')
        .contains('1');
    });

    it('should allow adding the conditions on the variant in the variants list', function () {
      createWorkflow('Test Conditions Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      addVariantActionClick('inApp');
      addConditions();
      goBack();

      cy.getByTestId('variant-item-card-0').getByTestId('conditions-action').should('be.visible').contains('1');
      cy.getByTestId('variant-item-card-0').should('be.visible').trigger('mouseover');
      cy.getByTestId('variant-item-card-0').getByTestId('add-conditions-action').should('be.visible').click();
      addConditions();

      cy.getByTestId('variant-item-card-0').getByTestId('conditions-action').should('be.visible').contains('2');
    });

    it('should allow adding the conditions in the step editor', function () {
      createWorkflow('Test Conditions Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      cy.getByTestId('editor-sidebar-add-conditions').click();
      addConditions();
      cy.getByTestId('editor-sidebar-edit-conditions').contains('1');
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      checkEditorContent('inApp');
      cy.getByTestId('editor-sidebar-edit-conditions').contains('1');
    });

    it('should allow adding the conditions in the variant editor', function () {
      createWorkflow('Test Conditions Action');

      dragAndDrop('email');
      editChannel('email');
      fillEditorContent('email');
      goBack();

      showStepActions('email');
      addVariantActionClick('email');
      addConditions();

      cy.getByTestId('editor-sidebar-edit-conditions').contains('1');
      cy.getByTestId('editor-sidebar-edit-conditions').click();
      addConditions();

      cy.getByTestId('editor-sidebar-edit-conditions').contains('2');
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');
      cy.getByTestId('editor-sidebar-edit-conditions').contains('2');
    });
  });

  describe('Edit action', function () {
    it('should allow editing step', function () {
      createWorkflow('Test Edit Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      cy.getByTestId('edit-action').should('be.visible').click();

      checkEditorContent('inApp');
    });

    it('should allow editing root step from the variants list', function () {
      createWorkflow('Test Edit Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      addVariantActionClick('inApp');
      addConditions();
      checkEditorContent('inApp');
      goBack();

      cy.getByTestId('variant-root-card').getByTestId('conditions-action').should('be.visible').contains('No');
      cy.getByTestId('variant-root-card').should('be.visible').trigger('mouseover');
      cy.getByTestId('variant-root-card').getByTestId('edit-step-action').should('be.visible').click();

      checkEditorContent('inApp');
    });

    it('should allow editing variant from the variants list', function () {
      createWorkflow('Test Edit Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      addVariantActionClick('inApp');
      addConditions();
      checkEditorContent('inApp');
      goBack();

      cy.getByTestId('variant-item-card-0').getByTestId('conditions-action').should('be.visible').contains('1');
      cy.getByTestId('variant-item-card-0').should('be.visible').trigger('mouseover');
      cy.getByTestId('variant-item-card-0').getByTestId('edit-action').should('be.visible').click();

      checkEditorContent('inApp');
    });
  });

  describe('Delete action', function () {
    it('should allow deleting step', function () {
      createWorkflow('Test Delete Action');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      goBack();

      showStepActions('inApp');
      cy.getByTestId('step-actions-menu').should('be.visible').click();
      cy.getByTestId('step-actions-menu').getByTestId('delete-step-action').should('be.visible').click();

      cy.get('.mantine-Modal-modal').contains('Delete step?');
      cy.get('.mantine-Modal-modal button').contains('Delete step').click();
      cy.getByTestId(`node-inAppSelector`).should('not.exist');

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      cy.getByTestId(`node-inAppSelector`).should('not.exist');
    });

    it('should allow deleting step from the variants list', function () {
      createWorkflow('Test Delete Action');

      dragAndDrop('email');
      editChannel('email');
      fillEditorContent('email');
      goBack();

      showStepActions('email');
      addVariantActionClick('email');
      addConditions();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');
      goBack();

      cy.reload();
      cy.wait('@getWorkflow');

      cy.getByTestId('editor-sidebar-delete').click();

      cy.get('.mantine-Modal-modal').contains('Delete step?');
      cy.get('.mantine-Modal-modal button').contains('Delete step').click();
      cy.getByTestId(`node-emailSelector`).should('not.exist');

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      cy.getByTestId(`node-emailSelector`).should('not.exist');
    });

    it('should allow deleting variant', function () {
      createWorkflow('Test Delete Action');

      dragAndDrop('email');
      editChannel('email');
      fillEditorContent('email');
      goBack();

      showStepActions('email');
      addVariantActionClick('email');
      addConditions();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');
      goBack();

      cy.getByTestId('variant-item-card-0').should('be.visible').trigger('mouseover');
      cy.getByTestId('variant-item-card-0').getByTestId('step-actions-menu').should('be.visible').click();
      cy.getByTestId('variant-item-card-0').getByTestId('delete-step-action').click();

      cy.get('.mantine-Modal-modal').contains('Delete variant?');
      cy.get('.mantine-Modal-modal button').contains('Delete variant').click();
      cy.getByTestId('variant-item-card-0').should('not.exist');
      goBack();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');
      cy.getByTestId('variants-count').should('not.exist');
    });
  });
});
