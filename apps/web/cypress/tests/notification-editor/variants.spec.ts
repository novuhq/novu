import { Channel, dragAndDrop, editChannel, goBack } from '.';

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
    cy.getByTestId('name-input').first().clear().type(title).blur();
  };

  const fillInAppEditorContentWith = (text: string) => {
    cy.get('.monaco-editor textarea:first').parent().click().find('textarea').clear({ force: true }).type(text, {
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
    cy.get('.monaco-editor textarea:first').parent().click().find('textarea').clear({ force: true }).type(content, {
      parseSpecialCharSequences: false,
      force: true,
    });
  };

  const fillChatEditorContentWith = (content: string) => {
    cy.get('.monaco-editor textarea:first').parent().click().find('textarea').clear({ force: true }).type(content, {
      parseSpecialCharSequences: false,
      force: true,
    });
  };

  const fillPushEditorContentWith = (title: string, content: string) => {
    cy.get('[data-test-id=push-title-container] .monaco-editor textarea:first')
      .parent()
      .click()
      .find('textarea')
      .clear({ force: true })
      .type(title, {
        parseSpecialCharSequences: false,
        force: true,
      });
    cy.get('[data-test-id=push-content-container] .monaco-editor textarea:first')
      .parent()
      .click()
      .find('textarea')
      .clear({ force: true })
      .type(content, {
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
    cy.getByTestId('apply-conditions-btn').click({ force: true });
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
        cy.get('.monaco-editor textarea:first')
          .parent()
          .click()
          .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'email':
        cy.getByTestId('emailSubject').should('have.value', SUBJECT_LINE);
        cy.getByTestId('email-editor').contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'sms':
        cy.get('.monaco-editor textarea:first')
          .parent()
          .click()
          .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'chat':
        cy.get('.monaco-editor textarea:first')
          .parent()
          .click()
          .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
      case 'push':
        cy.get('[data-test-id=push-title-container] .monaco-editor textarea:first')
          .parent()
          .click()
          .contains(PUSH_TITLE);
        cy.get('[data-test-id=push-content-container] .monaco-editor textarea:first')
          .parent()
          .click()
          .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
        break;
    }
  };

  const clearEditorContent = (channel: Channel) => {
    switch (channel) {
      case 'inApp':
        cy.get('.monaco-editor textarea:first').parent().click().type('{cmd}a').find('textarea').clear({
          force: true,
        });
        break;
      case 'email':
        cy.getByTestId('emailSubject').clear();
        cy.getByTestId('email-editor').clear();
        break;
      case 'sms':
        cy.get('.monaco-editor textarea:first').parent().click().type('{cmd}a').find('textarea').clear({
          force: true,
        });
        break;
      case 'chat':
        cy.get('.monaco-editor textarea:first').parent().click().type('{cmd}a').find('textarea').clear({
          force: true,
        });
        break;
      case 'push':
        cy.get('[data-test-id=push-title-container] .monaco-editor textarea:first')
          .parent()
          .click()
          .find('textarea')
          .type(Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a', { force: true })
          .clear({
            force: true,
          });

        cy.get('[data-test-id=push-content-container] .monaco-editor textarea:first')
          .parent()
          .click()
          .find('textarea')
          .type(Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a', { force: true })
          .clear({
            force: true,
          });
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

  const navigateAndPromoteAllChanges = () => {
    cy.getByTestId('side-nav-changes-link').click();
    cy.waitForNetworkIdle(500);
    cy.awaitAttachedGetByTestId('promote-all-btn').click();
  };

  const navigateAndOpenFirstWorkflow = () => {
    cy.getByTestId('side-nav-templates-link').click();
    cy.waitForNetworkIdle(500);
    cy.getByTestId('notifications-template').find('tbody tr').first().click();
    cy.wait('@getWorkflow');
  };

  const switchEnvironment = (environment: 'Production' | 'Development') => {
    cy.getByTestId('environment-switch').find(`input[value="${environment}"]`).click({ force: true });
    cy.waitForNetworkIdle(500);
  };

  const checkVariantListCard = ({
    selector,
    message,
    hasBorder = false,
  }: {
    message: string;
    selector: string;
    hasBorder?: boolean;
  }) => {
    cy.getByTestId(selector).contains(message);
    if (hasBorder) {
      cy.getByTestId(selector)
        .find('div[role="button"]')
        .first()
        .should('have.css', 'border-style', 'solid')
        .and('have.css', 'border-width', '1px');
    }
  };

  const checkVariantConditions = ({ selector, contains }: { selector: string; contains: string }) => {
    cy.getByTestId(selector).getByTestId('conditions-action').should('be.visible').contains(contains);
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

      cy.getByTestId('editor-sidebar-add-variant').click();
      addConditions();
      fillEditorContent('inApp', true);
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      checkEditorContent('inApp', true);
    });

    it('should allow creating multiple variants', function () {
      const channel = 'inApp';
      createWorkflow('Add multiple variants');

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);

      cy.getByTestId('editor-sidebar-add-variant').click();
      addConditions();
      fillEditorContent(channel, true);
      goBack();

      cy.getByTestId('variant-sidebar-add-variant').should('be.visible').click();
      addConditions();
      fillEditorContent(channel, true);
      goBack();
      goBack();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      cy.getByTestId(`node-${channel}Selector`).getByTestId('variants-count').contains('2 variants');
      cy.clickWorkflowNode(`node-${channel}Selector`);

      checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
      checkVariantConditions({ selector: 'variant-item-card-1', contains: '1' });

      checkVariantListCard({ selector: 'variant-item-card-0', message: VARIANT_EDITOR_TEXT });
      checkVariantConditions({ selector: 'variant-item-card-0', contains: '1' });

      checkVariantListCard({ selector: 'variant-root-card', message: EDITOR_TEXT });
      checkVariantConditions({ selector: 'variant-item-card-0', contains: 'No' });
    });

    it('should not allow creating variant for digest step', function () {
      const channel = 'digest';
      createWorkflow('Add variant not available');

      dragAndDrop(channel);
      showStepActions(channel);

      cy.getByTestId(`node-${channel}Selector`)
        .getByTestId('step-actions-menu')
        .click()
        .getByTestId('add-variant-action')
        .should('not.exist');

      editChannel(channel);
      cy.getByTestId('editor-sidebar-add-variant').should('not.exist');
    });

    it('should not allow creating variant for delay step', function () {
      const channel = 'delay';
      createWorkflow('Add variant not available');

      dragAndDrop(channel);
      showStepActions(channel);

      cy.getByTestId(`node-${channel}Selector`)
        .getByTestId('step-actions-menu')
        .click()
        .getByTestId('add-variant-action')
        .should('not.exist');

      editChannel(channel);
      cy.getByTestId('editor-sidebar-add-variant').should('not.exist');
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

    it('in production should show only the edit step action', function () {
      const channel = 'sms';
      createWorkflow(`Production Test Step Actions`);

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      navigateAndPromoteAllChanges();

      switchEnvironment('Production');

      navigateAndOpenFirstWorkflow();

      cy.getByTestId(`node-${channel}Selector`).getByTestId('conditions-action').should('not.exist');
      showStepActions(channel);
      cy.getByTestId(`node-${channel}Selector`).getByTestId('edit-action').should('be.visible');
      cy.getByTestId(`node-${channel}Selector`).getByTestId('add-conditions-action').should('not.exist');
      cy.getByTestId(`node-${channel}Selector`).getByTestId('step-actions-menu').should('not.exist');
    });

    it('in production should show the step actions: edit and conditions', function () {
      const channel = 'sms';
      createWorkflow(`Production Test Step Actions`);

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);
      goBack();

      showStepActions(channel);
      cy.getByTestId('add-conditions-action').should('be.visible').click();
      addConditions();
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      navigateAndPromoteAllChanges();

      switchEnvironment('Production');

      navigateAndOpenFirstWorkflow();

      cy.getByTestId(`node-${channel}Selector`).getByTestId('conditions-action').should('be.visible').contains('1');
      showStepActions(channel);
      cy.getByTestId(`node-${channel}Selector`).getByTestId('edit-action').should('be.visible');
      cy.getByTestId(`node-${channel}Selector`).getByTestId('add-conditions-action').should('be.visible');
      cy.getByTestId(`node-${channel}Selector`).getByTestId('step-actions-menu').should('not.exist');
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

    it('in production should show only the close action', function () {
      const channel = 'sms';
      createWorkflow(`Production Test Editor Actions`);

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      navigateAndPromoteAllChanges();

      switchEnvironment('Production');

      navigateAndOpenFirstWorkflow();

      editChannel(channel);
      cy.getByTestId('editor-sidebar-add-variant').should('not.exist');
      cy.getByTestId('editor-sidebar-add-conditions').should('not.exist');
      cy.getByTestId('editor-sidebar-edit-conditions').should('not.exist');
      cy.getByTestId('editor-sidebar-delete').should('not.exist');
    });

    it('in production should only show the view conditions action', function () {
      const channel = 'sms';
      createWorkflow(`Production Test Editor Actions`);

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);
      goBack();

      showStepActions(channel);
      cy.getByTestId('add-conditions-action').should('be.visible').click();
      addConditions();
      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      navigateAndPromoteAllChanges();

      switchEnvironment('Production');

      navigateAndOpenFirstWorkflow();

      editChannel(channel);
      cy.getByTestId('editor-sidebar-add-variant').should('not.exist');
      cy.getByTestId('editor-sidebar-add-conditions').should('not.exist');
      cy.getByTestId('editor-sidebar-edit-conditions').should('be.visible');
      cy.getByTestId('editor-sidebar-delete').should('not.exist');
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

      cy.getByTestId('variants-list-sidebar')
        .getByTestId('variant-sidebar-add-conditions')
        .should('be.visible')
        .click();
      addConditions();

      cy.getByTestId('variants-list-sidebar')
        .getByTestId('variant-sidebar-edit-conditions')
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

    it('in production should only allow edit and view conditions on variant list item', function () {
      const channel = 'chat';
      createWorkflow(`Production Variant Actions`);

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);
      goBack();

      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      navigateAndPromoteAllChanges();

      switchEnvironment('Production');

      navigateAndOpenFirstWorkflow();

      cy.clickWorkflowNode(`node-${channel}Selector`);

      cy.getByTestId('variant-item-card-0').getByTestId('conditions-action').should('be.visible').contains('1');
      cy.getByTestId('variant-item-card-0').trigger('mouseover');
      cy.getByTestId('variant-item-card-0').getByTestId('edit-action').should('be.visible');
      cy.getByTestId('variant-item-card-0').getByTestId('add-conditions-action').should('be.visible');
      cy.getByTestId('variant-item-card-0').getByTestId('step-actions-menu').should('not.exist');
    });

    it('in production should only allow edit the variant root list item', function () {
      const channel = 'chat';
      createWorkflow(`Production Variant Actions`);

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);
      goBack();

      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      navigateAndPromoteAllChanges();

      switchEnvironment('Production');

      navigateAndOpenFirstWorkflow();

      cy.clickWorkflowNode(`node-${channel}Selector`);

      cy.getByTestId('variant-root-card').getByTestId('conditions-action').should('be.visible').contains('No');
      cy.getByTestId('variant-root-card').trigger('mouseover');
      cy.getByTestId('variant-root-card').getByTestId('edit-step-action').should('be.visible');
      cy.getByTestId('variant-root-card').getByTestId('add-conditions-action').should('not.exist');
      cy.getByTestId('variant-root-card').getByTestId('step-actions-menu').should('not.exist');
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

      cy.getByTestId('variant-sidebar-delete').click();

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

    it('should not allow removing all conditions from a variant', function () {
      createWorkflow('Test Removing All Conditions');

      dragAndDrop('inApp');
      editChannel('inApp');
      fillEditorContent('inApp');
      goBack();

      showStepActions('inApp');
      addVariantActionClick('inApp');
      addConditions();

      cy.getByTestId('notification-template-submit-btn').click();
      cy.wait('@updateWorkflow');

      cy.reload();
      cy.wait('@getWorkflow');

      // edit the variant condition
      cy.getByTestId('editor-sidebar-edit-conditions').click();

      // open conditions row menu
      cy.getByTestId('conditions-row-btn').click();

      // delete the condition
      cy.contains('Delete').click();

      // submit ("Apply conditions") should be disabled
      cy.getByTestId('apply-conditions-btn').should('be.disabled').click({ force: true });

      // tooltip should warn the user
      cy.get('div[role="tooltip"]').contains('At least one condition is required');
    });
  });

  describe('Variants List Errors', function () {
    const checkCurrentError = ({ message, count }: { message: string; count: string }) => {
      cy.getByTestId('variants-list-current-error').contains(message);
      cy.getByTestId('variants-list-errors-count').contains(count);
    };

    it('should show the push variant errors', function () {
      const channel = 'push';
      const messageTitleMissing = 'Message title is missing!';
      const messageContentMissing = 'Message content is missing!';
      createWorkflow('Variants List Errors');

      dragAndDrop(channel);
      editChannel(channel);
      fillEditorContent(channel);
      goBack();

      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();
      clearEditorContent(channel);
      goBack();

      checkCurrentError({ message: messageTitleMissing, count: '1/2' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing, hasBorder: true });

      cy.getByTestId('variants-list-errors-down').click();
      checkCurrentError({ message: messageContentMissing, count: '2/2' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageContentMissing, hasBorder: true });

      cy.getByTestId('variants-list-errors-up').click();
      checkCurrentError({ message: messageTitleMissing, count: '1/2' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing, hasBorder: true });
    });

    it('should show the push variant errors and root errors', function () {
      const channel = 'push';
      const messageTitleMissing = 'Message title is missing!';
      const messageContentMissing = 'Message content is missing!';
      createWorkflow('Variants List Errors');

      dragAndDrop(channel);
      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();
      goBack();

      checkCurrentError({ message: messageTitleMissing, count: '1/4' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing, hasBorder: true });
      checkVariantListCard({ selector: 'variant-root-card', message: messageTitleMissing });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageContentMissing, count: '2/4' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageContentMissing, hasBorder: true });
      checkVariantListCard({ selector: 'variant-root-card', message: messageTitleMissing });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageTitleMissing, count: '3/4' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing });
      checkVariantListCard({ selector: 'variant-root-card', message: messageTitleMissing, hasBorder: true });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageContentMissing, count: '4/4' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing });
      checkVariantListCard({ selector: 'variant-root-card', message: messageContentMissing, hasBorder: true });
    });

    it('should show the email variant and root errors', function () {
      const channel = 'email';
      const messageSubjectMissing = 'Email subject is missing!';
      createWorkflow('Variants List Errors');

      dragAndDrop(channel);
      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();
      goBack();
      goBack();

      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();
      fillEditorContent(channel, true);
      goBack();
      goBack();

      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();
      goBack();

      checkCurrentError({ message: messageSubjectMissing, count: '1/3' });
      checkVariantListCard({ selector: 'variant-item-card-2', message: messageSubjectMissing, hasBorder: true });
      checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
      checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageSubjectMissing, count: '2/3' });
      checkVariantListCard({ selector: 'variant-item-card-2', message: messageSubjectMissing });
      checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing, hasBorder: true });
      checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageSubjectMissing, count: '3/3' });
      checkVariantListCard({ selector: 'variant-item-card-2', message: messageSubjectMissing });
      checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
      checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing, hasBorder: true });
    });

    it('should show the provider missing error', function () {
      cy.intercept('*/integrations', {
        data: [],
        delay: 0,
      }).as('getIntegrations');
      cy.intercept('*/integrations/active', {
        data: [],
        delay: 0,
      }).as('getActiveIntegrations');

      const channel = 'email';
      const messageSubjectMissing = 'Email subject is missing!';
      const messageProviderMissing = 'Provider is missing!';
      createWorkflow('Variants List Errors');

      dragAndDrop(channel);
      showStepActions(channel);
      addVariantActionClick(channel);
      addConditions();
      goBack();

      checkCurrentError({ message: messageSubjectMissing, count: '1/3' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing, hasBorder: true });
      checkVariantListCard({ selector: 'variant-root-card', message: messageProviderMissing });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageProviderMissing, count: '2/3' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
      checkVariantListCard({ selector: 'variant-root-card', message: messageProviderMissing, hasBorder: true });

      cy.getByTestId('variants-list-errors-down').click();

      checkCurrentError({ message: messageSubjectMissing, count: '3/3' });
      checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
      checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing, hasBorder: true });
    });
  });
});
