// import { Channel } from '.';

/*
 * const EDITOR_TEXT = 'Hello, world!';
 * const VARIANT_EDITOR_TEXT = 'Hello, world from Variant!';
 * const SUBJECT_LINE = 'Novu test';
 * const PUSH_TITLE = 'Push test';
 */

/*
 * describe('Workflow Editor - Variants', function () {
 *   beforeEach(function () {
 *     cy.initializeSession().as('session');
 *   });
 */

//   const createWorkflow = (title: string) => {
//     cy.intercept('GET', '**/notification-templates/**').as('getWorkflow');
//     cy.intercept('PUT', '**/notification-templates/**').as('updateWorkflow');
//     cy.waitLoadTemplatePage(() => {
//       cy.visit('/workflows/create');
//     });
//     cy.wait('@getWorkflow');
//     cy.getByTestId('name-input').first().clear().type(title).blur();
//   };

/*
 *   const fillInAppEditorContentWith = (text: string) => {
 *     cy.get('.monaco-editor textarea:first').parent().click().find('textarea').clear({ force: true }).type(text, {
 *       parseSpecialCharSequences: false,
 *       force: true,
 *     });
 *   };
 */

/*
 *   const fillEmailEditorContentWith = (subjectLine: string, content: string) => {
 *     cy.getByTestId('emailSubject').clear().type(subjectLine, {
 *       parseSpecialCharSequences: false,
 *       force: true,
 *     });
 *     cy.getByTestId('editable-text-content').clear().type(content, {
 *       parseSpecialCharSequences: false,
 *     });
 *   };
 */

/*
 *   const fillSmsEditorContentWith = (content: string) => {
 *     cy.get('.monaco-editor textarea:first').parent().click().find('textarea').clear({ force: true }).type(content, {
 *       parseSpecialCharSequences: false,
 *       force: true,
 *     });
 *   };
 */

/*
 *   const fillChatEditorContentWith = (content: string) => {
 *     cy.get('.monaco-editor textarea:first').parent().click().find('textarea').clear({ force: true }).type(content, {
 *       parseSpecialCharSequences: false,
 *       force: true,
 *     });
 *   };
 */

/*
 *   const fillPushEditorContentWith = (title: string, content: string) => {
 *     cy.get('[data-test-id=push-title-container] .monaco-editor textarea:first')
 *       .parent()
 *       .click()
 *       .find('textarea')
 *       .clear({ force: true })
 *       .type(title, {
 *         parseSpecialCharSequences: false,
 *         force: true,
 *       });
 *     cy.get('[data-test-id=push-content-container] .monaco-editor textarea:first')
 *       .parent()
 *       .click()
 *       .find('textarea')
 *       .clear({ force: true })
 *       .type(content, {
 *         parseSpecialCharSequences: false,
 *         force: true,
 *       });
 *   };
 */

/*
 *   const showStepActions = (channel: Channel) => {
 *     cy.getByTestId(`node-${channel}Selector`).parent().trigger('mouseover');
 *   };
 */

/*
 *   const addVariantActionClick = (channel: Channel) => {
 *     cy.getByTestId(`node-${channel}Selector`)
 *       .getByTestId('step-actions-menu')
 *       .click()
 *       .getByTestId('add-variant-action')
 *       .click();
 *   };
 */

/*
 *   const addConditions = () => {
 *     cy.getByTestId('add-new-condition').click();
 *     cy.getByTestId('conditions-form-key').last().type('test');
 *     cy.getByTestId('conditions-form-value').last().type('test');
 *     cy.getByTestId('apply-conditions-btn').click({ force: true });
 *   };
 */

/*
 *   const fillEditorContent = (channel: Channel, isVariant = false) => {
 *     switch (channel) {
 *       case 'inApp':
 *         fillInAppEditorContentWith(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'email':
 *         fillEmailEditorContentWith(SUBJECT_LINE, isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'sms':
 *         fillSmsEditorContentWith(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'chat':
 *         fillChatEditorContentWith(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'push':
 *         fillPushEditorContentWith(PUSH_TITLE, isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *     }
 *   };
 */

/*
 *   const checkEditorContent = (channel: Channel, isVariant = false) => {
 *     switch (channel) {
 *       case 'inApp':
 *         cy.get('.monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'email':
 *         cy.getByTestId('emailSubject').should('have.value', SUBJECT_LINE);
 *         cy.getByTestId('email-editor').contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'sms':
 *         cy.get('.monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'chat':
 *         cy.get('.monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *       case 'push':
 *         cy.get('[data-test-id=push-title-container] .monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .contains(PUSH_TITLE);
 *         cy.get('[data-test-id=push-content-container] .monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .contains(isVariant ? VARIANT_EDITOR_TEXT : EDITOR_TEXT);
 *         break;
 *     }
 *   };
 */

/*
 *   const clearEditorContent = (channel: Channel) => {
 *     switch (channel) {
 *       case 'inApp':
 *         cy.get('.monaco-editor textarea:first').parent().click().type('{cmd}a').find('textarea').clear({
 *           force: true,
 *         });
 *         break;
 *       case 'email':
 *         cy.getByTestId('emailSubject').clear();
 *         cy.getByTestId('email-editor').clear();
 *         break;
 *       case 'sms':
 *         cy.get('.monaco-editor textarea:first').parent().click().type('{cmd}a').find('textarea').clear({
 *           force: true,
 *         });
 *         break;
 *       case 'chat':
 *         cy.get('.monaco-editor textarea:first').parent().click().type('{cmd}a').find('textarea').clear({
 *           force: true,
 *         });
 *         break;
 *       case 'push':
 *         cy.get('[data-test-id=push-title-container] .monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .find('textarea')
 *           .type(Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a', { force: true })
 *           .clear({
 *             force: true,
 *           });
 */

/*
 *         cy.get('[data-test-id=push-content-container] .monaco-editor textarea:first')
 *           .parent()
 *           .click()
 *           .find('textarea')
 *           .type(Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a', { force: true })
 *           .clear({
 *             force: true,
 *           });
 *         break;
 *     }
 *   };
 */

/*
 *   const navigateAndPromoteAllChanges = () => {
 *     cy.getByTestId('side-nav-changes-link').click();
 *     cy.waitForNetworkIdle(500);
 *     cy.awaitAttachedGetByTestId('promote-all-btn').click();
 *   };
 */

/*
 *   const navigateAndOpenFirstWorkflow = () => {
 *     cy.getByTestId('side-nav-templates-link').click();
 *     cy.waitForNetworkIdle(500);
 *     cy.getByTestId('notifications-template').find('tbody tr').first().click();
 *     cy.wait('@getWorkflow');
 *   };
 */

/*
 *   const switchEnvironment = (environment: 'Production' | 'Development') => {
 *     cy.getByTestId('environment-switch').find(`input[value="${environment}"]`).click({ force: true });
 *     cy.waitForNetworkIdle(500);
 *   };
 */

/*
 *   const checkVariantListCard = ({
 *     selector,
 *     message,
 *     hasBorder = false,
 *   }: {
 *     message: string;
 *     selector: string;
 *     hasBorder?: boolean;
 *   }) => {
 *     cy.getByTestId(selector).contains(message);
 *     if (hasBorder) {
 *       cy.getByTestId(selector)
 *         .find('div[role="button"]')
 *         .first()
 *         .should('have.css', 'border-style', 'solid')
 *         .and('have.css', 'border-width', '1px');
 *     }
 *   };
 */

/*
 *   describe('Add conditions action', function () {
 *     it('should allow adding the conditions in the variant editor', function () {
 *       createWorkflow('Test Conditions Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'email'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'email'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('email')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('email');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('email');
 *       addVariantActionClick('email');
 *       addConditions();
 */

/*
 *       cy.getByTestId('editor-sidebar-edit-conditions').contains('1');
 *       cy.getByTestId('editor-sidebar-edit-conditions').click();
 *       addConditions();
 */

/*
 *       cy.getByTestId('editor-sidebar-edit-conditions').contains('2');
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 *       cy.getByTestId('editor-sidebar-edit-conditions').contains('2');
 *     });
 */

/*
 *     it('in production should only allow edit and view conditions on variant list item', function () {
 *       const channel = 'chat';
 *       createWorkflow(`Production Variant Actions`);
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${channel}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes(channel)) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent(channel);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

//       navigateAndPromoteAllChanges();

//       switchEnvironment('Production');

//       navigateAndOpenFirstWorkflow();

//       cy.clickWorkflowNode(`node-${channel}Selector`);

/*
 *       cy.getByTestId('variant-item-card-0').getByTestId('conditions-action').should('be.visible').contains('1');
 *       cy.getByTestId('variant-item-card-0').trigger('mouseover');
 *       cy.getByTestId('variant-item-card-0').getByTestId('edit-action').should('be.visible');
 *       cy.getByTestId('variant-item-card-0').getByTestId('add-conditions-action').should('be.visible');
 *       cy.getByTestId('variant-item-card-0').getByTestId('step-actions-menu').should('not.exist');
 *     });
 */

/*
 *     it('in production should only allow edit the variant root list item', function () {
 *       const channel = 'chat';
 *       createWorkflow(`Production Variant Actions`);
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${channel}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes(channel)) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent(channel);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

//       navigateAndPromoteAllChanges();

//       switchEnvironment('Production');

//       navigateAndOpenFirstWorkflow();

//       cy.clickWorkflowNode(`node-${channel}Selector`);

/*
 *       cy.getByTestId('variant-root-card').getByTestId('conditions-action').should('be.visible').contains('No');
 *       cy.getByTestId('variant-root-card').trigger('mouseover');
 *       cy.getByTestId('variant-root-card').getByTestId('edit-step-action').should('be.visible');
 *       cy.getByTestId('variant-root-card').getByTestId('add-conditions-action').should('not.exist');
 *       cy.getByTestId('variant-root-card').getByTestId('step-actions-menu').should('not.exist');
 *     });
 *   });
 */

/*
 *   describe('Edit action', function () {
 *     it('should allow editing step', function () {
 *       createWorkflow('Test Edit Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'inApp'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'inApp'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('inApp')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('inApp');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('inApp');
 *       cy.getByTestId('edit-action').should('be.visible').click();
 */

/*
 *       checkEditorContent('inApp');
 *     });
 */

/*
 *     it('should allow editing root step from the variants list', function () {
 *       createWorkflow('Test Edit Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'inApp'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'inApp'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('inApp')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('inApp');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('inApp');
 *       addVariantActionClick('inApp');
 *       addConditions();
 *       checkEditorContent('inApp');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       cy.getByTestId('variant-root-card').getByTestId('conditions-action').should('be.visible').contains('No');
 *       cy.getByTestId('variant-root-card').should('be.visible').trigger('mouseover');
 *       cy.getByTestId('variant-root-card').getByTestId('edit-step-action').should('be.visible').click();
 */

/*
 *       checkEditorContent('inApp');
 *     });
 */

/*
 *     it('should allow editing variant from the variants list', function () {
 *       createWorkflow('Test Edit Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'inApp'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'inApp'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('inApp')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('inApp');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('inApp');
 *       addVariantActionClick('inApp');
 *       addConditions();
 *       checkEditorContent('inApp');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       cy.getByTestId('variant-item-card-0').getByTestId('conditions-action').should('be.visible').contains('1');
 *       cy.getByTestId('variant-item-card-0').should('be.visible').trigger('mouseover');
 *       cy.getByTestId('variant-item-card-0').getByTestId('edit-action').should('be.visible').click();
 */

/*
 *       checkEditorContent('inApp');
 *     });
 *   });
 */

/*
 *   describe('Delete action', function () {
 *     it('should allow deleting step', function () {
 *       createWorkflow('Test Delete Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'inApp'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'inApp'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('inApp')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('inApp');
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 */

/*
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('inApp');
 *       cy.getByTestId('step-actions-menu').should('be.visible').click();
 *       cy.getByTestId('step-actions-menu').getByTestId('delete-step-action').should('be.visible').click();
 */

/*
 *       cy.get('.mantine-Modal-modal').contains('Delete step?');
 *       cy.get('.mantine-Modal-modal button').contains('Delete step').click();
 *       cy.getByTestId(`node-inAppSelector`).should('not.exist');
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 */

/*
 *       cy.getByTestId(`node-inAppSelector`).should('not.exist');
 *     });
 */

/*
 *     it('should allow deleting step from the variants list', function () {
 *       createWorkflow('Test Delete Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'email'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'email'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('email')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('email');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('email');
 *       addVariantActionClick('email');
 *       addConditions();
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 */

//       cy.getByTestId('variant-sidebar-delete').click();

/*
 *       cy.get('.mantine-Modal-modal').contains('Delete step?');
 *       cy.get('.mantine-Modal-modal button').contains('Delete step').click();
 *       cy.getByTestId(`node-emailSelector`).should('not.exist');
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 */

/*
 *       cy.getByTestId(`node-emailSelector`).should('not.exist');
 *     });
 */

/*
 *     it('should allow deleting variant', function () {
 *       createWorkflow('Test Delete Action');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'email'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'email'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('email')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('email');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('email');
 *       addVariantActionClick('email');
 *       addConditions();
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       cy.getByTestId('variant-item-card-0').should('be.visible').trigger('mouseover');
 *       cy.getByTestId('variant-item-card-0').getByTestId('step-actions-menu').should('be.visible').click();
 *       cy.getByTestId('variant-item-card-0').getByTestId('delete-step-action').click();
 */

/*
 *       cy.get('.mantine-Modal-modal').contains('Delete variant?');
 *       cy.get('.mantine-Modal-modal button').contains('Delete variant').click();
 *       cy.getByTestId('variant-item-card-0').should('not.exist');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 *       cy.getByTestId('variants-count').should('not.exist');
 *     });
 */

/*
 *     it('should not allow removing all conditions from a variant', function () {
 *       createWorkflow('Test Removing All Conditions');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${'inApp'}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${'inApp'}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes('inApp')) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent('inApp');
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions('inApp');
 *       addVariantActionClick('inApp');
 *       addConditions();
 */

/*
 *       cy.getByTestId('notification-template-submit-btn').click();
 *       cy.wait('@updateWorkflow');
 */

/*
 *       cy.reload();
 *       cy.wait('@getWorkflow');
 */

/*
 *       // edit the variant condition
 *       cy.getByTestId('editor-sidebar-edit-conditions').click();
 */

/*
 *       // open conditions row menu
 *       cy.getByTestId('conditions-row-btn').click();
 */

/*
 *       // delete the condition
 *       cy.contains('Delete').click();
 */

/*
 *       // submit ("Apply conditions") should be disabled
 *       cy.getByTestId('apply-conditions-btn').should('be.disabled').click({ force: true });
 */

/*
 *       // tooltip should warn the user
 *       cy.get('div[role="tooltip"]').contains('At least one condition is required');
 *     });
 *   });
 */

/*
 *   describe('Variants List Errors', function () {
 *     const checkCurrentError = ({ message, count }: { message: string; count: string }) => {
 *       cy.getByTestId('variants-list-current-error').contains(message);
 *       cy.getByTestId('variants-list-errors-count').contains(count);
 *     };
 */

/*
 *     it('should show the push variant errors', function () {
 *       const channel = 'push';
 *       const messageTitleMissing = 'Message title is missing!';
 *       const messageContentMissing = 'Message content is missing!';
 *       createWorkflow('Variants List Errors');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       cy.clickWorkflowNode(`node-${channel}Selector`, false);
 *       if (['inApp', 'email', 'sms', 'chat', 'push'].includes(channel)) {
 *         cy.getByTestId('edit-action').click();
 *       }
 *       fillEditorContent(channel);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 *       clearEditorContent(channel);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       checkCurrentError({ message: messageTitleMissing, count: '1/2' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing, hasBorder: true });
 */

/*
 *       cy.getByTestId('variants-list-errors-down').click();
 *       checkCurrentError({ message: messageContentMissing, count: '2/2' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageContentMissing, hasBorder: true });
 */

/*
 *       cy.getByTestId('variants-list-errors-up').click();
 *       checkCurrentError({ message: messageTitleMissing, count: '1/2' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing, hasBorder: true });
 *     });
 */

/*
 *     it('should show the push variant errors and root errors', function () {
 *       const channel = 'push';
 *       const messageTitleMissing = 'Message title is missing!';
 *       const messageContentMissing = 'Message content is missing!';
 *       createWorkflow('Variants List Errors');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       checkCurrentError({ message: messageTitleMissing, count: '1/4' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing, hasBorder: true });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageTitleMissing });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageContentMissing, count: '2/4' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageContentMissing, hasBorder: true });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageTitleMissing });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageTitleMissing, count: '3/4' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageTitleMissing, hasBorder: true });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageContentMissing, count: '4/4' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageTitleMissing });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageContentMissing, hasBorder: true });
 *     });
 */

/*
 *     it('should show the email variant and root errors', function () {
 *       const channel = 'email';
 *       const messageSubjectMissing = 'Email subject is missing!';
 *       createWorkflow('Variants List Errors');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 *       fillEditorContent(channel, true);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       checkCurrentError({ message: messageSubjectMissing, count: '1/3' });
 *       checkVariantListCard({ selector: 'variant-item-card-2', message: messageSubjectMissing, hasBorder: true });
 *       checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageSubjectMissing, count: '2/3' });
 *       checkVariantListCard({ selector: 'variant-item-card-2', message: messageSubjectMissing });
 *       checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing, hasBorder: true });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageSubjectMissing, count: '3/3' });
 *       checkVariantListCard({ selector: 'variant-item-card-2', message: messageSubjectMissing });
 *       checkVariantListCard({ selector: 'variant-item-card-1', message: VARIANT_EDITOR_TEXT });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing, hasBorder: true });
 *     });
 */

//     it('should show the provider missing error', function () {
//       cy.intercept('*/integrations', {
//         data: [],
//         delay: 0,
//       }).as('getIntegrations');
//       cy.intercept('*/integrations/active', {
//         data: [],
//         delay: 0,
//       }).as('getActiveIntegrations');

/*
 *       const channel = 'email';
 *       const messageSubjectMissing = 'Email subject is missing!';
 *       const messageProviderMissing = 'Provider is missing!';
 *       createWorkflow('Variants List Errors');
 */

//       const dataTransfer = new DataTransfer();

/*
 *       cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
 *       cy.getByTestId('addNodeButton').parent().trigger('drop', { dataTransfer });
 *       showStepActions(channel);
 *       addVariantActionClick(channel);
 *       addConditions();
 *       cy.getByTestId('sidebar-close').click();
 *       cy.waitForNetworkIdle(500);
 */

/*
 *       checkCurrentError({ message: messageSubjectMissing, count: '1/3' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing, hasBorder: true });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageProviderMissing });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageProviderMissing, count: '2/3' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageProviderMissing, hasBorder: true });
 */

//       cy.getByTestId('variants-list-errors-down').click();

/*
 *       checkCurrentError({ message: messageSubjectMissing, count: '3/3' });
 *       checkVariantListCard({ selector: 'variant-item-card-0', message: messageSubjectMissing });
 *       checkVariantListCard({ selector: 'variant-root-card', message: messageSubjectMissing, hasBorder: true });
 *     });
 *   });
 * });
 */
