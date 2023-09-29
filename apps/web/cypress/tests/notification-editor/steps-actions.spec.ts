import { clickWorkflow, dragAndDrop, editChannel, goBack } from '.';

describe('Workflow Editor - Steps Actions', function () {
  beforeEach(function () {
    cy.initializeSession({ showOnBoardingTour: false }).as('session');
  });

  const interceptEditTemplateRequests = () => {
    cy.intercept('**/notification-templates/**').as('getTemplateToEdit');
    cy.intercept('**/notification-groups').as('getNotificationGroups');
  };

  const waitForEditTemplateRequests = () => {
    cy.wait('@getTemplateToEdit');
    cy.wait('@getNotificationGroups');
  };

  it('should be able to delete a step', function () {
    interceptEditTemplateRequests();
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    waitForEditTemplateRequests();

    cy.get('.react-flow__node').should('have.length', 4);
    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.waitForNetworkIdle(500);
    cy.getByTestId('delete-step-button').click();
    cy.get('.mantine-Modal-modal button').contains('Delete step').click();
    cy.getByTestId(`node-inAppSelector`).should('not.exist');
    cy.get('.react-flow__node').should('have.length', 3);
    cy.get('.react-flow__node').first().should('contain', 'Workflow trigger').next().should('contain', 'Email');
    cy.getByTestId('notification-template-submit-btn').click();

    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.get('.react-flow__node').should('have.length', 3);
  });

  it('should show add step in sidebar after delete', function () {
    interceptEditTemplateRequests();
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    waitForEditTemplateRequests();

    cy.get('.react-flow__node').should('have.length', 4);
    cy.getByTestId('node-inAppSelector')
      .getByTestId('channel-node')
      .first()
      .trigger('mouseover', { force: true })
      .getByTestId('delete-step-action')
      .click();
    cy.get('.mantine-Modal-modal button').contains('Delete step').click();
    cy.getByTestId(`node-inAppSelector`).should('not.exist');
    cy.get('.react-flow__node').should('have.length', 3);
    cy.getByTestId('drag-side-menu').contains('Channels');
  });

  it('should show add step in sidebar after a delete of a step with side settings ', function () {
    interceptEditTemplateRequests();
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    waitForEditTemplateRequests();
    dragAndDrop('digest');
    cy.get('.react-flow__node').should('have.length', 5);
    cy.clickWorkflowNode('node-digestSelector');

    cy.getByTestId('node-digestSelector')
      .getByTestId('channel-node')
      .last()
      .trigger('mouseover', { force: true })
      .getByTestId('delete-step-action')
      .click();
    cy.get('.mantine-Modal-modal button').contains('Delete step').click();
    cy.getByTestId(`node-digestSelector`).should('not.exist');
    cy.get('.react-flow__node').should('have.length', 4);
    cy.getByTestId('drag-side-menu').contains('Channels');
  });

  it('should keep steps order on reload', function () {
    interceptEditTemplateRequests();
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);
    waitForEditTemplateRequests();

    dragAndDrop('sms');

    editChannel('sms');
    cy.getByTestId('smsNotificationContent').type('new content for sms');
    cy.getByTestId('notification-template-submit-btn').click();

    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    cy.get('.react-flow__node').should('have.length', 5);
    cy.get('.react-flow__node')
      .first()
      .should('contain', 'Workflow trigger')
      .next()
      .should('contain', 'In-App')
      .next()
      .should('contain', 'Email')
      .next()
      .should('contain', 'SMS');
  });

  it('should be able to disable step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-active-switch`).get('label').contains('Active');
    cy.getByTestId(`step-active-switch`).click({ force: true });
    goBack();

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-active-switch`).get('label').contains('Inactive');
  });

  it('should be able to toggle ShouldStopOnFailSwitch', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-should-stop-on-fail-switch`).get('label').contains('Stop if step fails');
    cy.getByTestId(`step-should-stop-on-fail-switch`).click({ force: true });
    goBack();

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-should-stop-on-fail-switch`).should('be.checked');
  });

  it('should be able to add filters to a digest step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);
    dragAndDrop('digest');

    cy.clickWorkflowNode(`node-digestSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Subscriber').click();

    cy.getByTestId('filter-key-input').type('filter-key');
    cy.getByTestId('filter-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Equal').click();
    cy.getByTestId('filter-value-input').type('filter-value');

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');

    cy.getByTestId('notification-template-submit-btn').click();
    cy.waitForNetworkIdle(500);
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.clickWorkflowNode(`node-digestSelector`);
    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to add filters to a delay step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);
    dragAndDrop('delay');

    cy.clickWorkflowNode(`node-delaySelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Subscriber').click();

    cy.getByTestId('filter-key-input').type('filter-key');
    cy.getByTestId('filter-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Equal').click();
    cy.getByTestId('filter-value-input').type('filter-value');

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');

    cy.getByTestId('notification-template-submit-btn').click();
    cy.waitForNetworkIdle(500);
    cy.visit('/workflows/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    cy.clickWorkflowNode(`node-delaySelector`);
    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to add filters to a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Subscriber').click();

    cy.getByTestId('filter-key-input').type('filter-key');
    cy.getByTestId('filter-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Equal').click();
    cy.getByTestId('filter-value-input').type('filter-value');

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to add read/seen filters to a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-emailSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Previous step').click();

    cy.getByTestId('previous-step-dropdown').click();
    cy.get('.mantine-Select-item').contains('In-App').click();
    cy.getByTestId('previous-step-type-dropdown').click();
    cy.get('.mantine-Select-item').contains('Read').click();

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to not add read/seen filters to first step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Previous step').should('not.exist');
  });

  it('should be able to remove filters for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();

    cy.getByTestId('filter-key-input').type('filter-key');
    cy.getByTestId('filter-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Equal').click();
    cy.getByTestId('filter-value-input').type('filter-value');

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('filter-remove-btn').click();
    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('Add filter');
  });

  it('should be able to add webhook filter for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('Or').click();

    cy.getByTestId('create-rule-btn').click();

    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Webhook').click();

    cy.getByTestId('webhook-filter-url-input').type('www.example.com');
    cy.getByTestId('filter-key-input').type('filter-key');
    cy.getByTestId('filter-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Equal').click();
    cy.getByTestId('filter-value-input').type('filter-value');

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to add online right now filter for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();

    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Online right now').click();
    cy.getByTestId('online-now-value-dropdown').click();
    cy.get('.mantine-Select-item').contains('Yes').click();

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to add online in the last X time period filter for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();

    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains("Online in the last 'X' time period").click();
    cy.getByTestId('online-in-last-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Hours').click();
    cy.getByTestId('online-in-last-value-input').type('1');

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('1 filter');
  });

  it('should be able to add multiple filters to a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/workflows/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.clickWorkflowNode(`node-inAppSelector`);

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('group-rules-dropdown').click();
    cy.get('.mantine-Select-item').contains('And').click();

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').click();
    cy.get('.mantine-Select-item').contains('Subscriber').click();

    cy.getByTestId('filter-key-input').type('filter-key');
    cy.getByTestId('filter-operator-dropdown').click();
    cy.get('.mantine-Select-item').contains('Equal').click();
    cy.getByTestId('filter-value-input').type('filter-value');

    cy.getByTestId('create-rule-btn').click();
    cy.getByTestId('filter-on-dropdown').eq(1).click();
    cy.get('.mantine-Select-item').contains('Online right now').click();
    cy.getByTestId('online-now-value-dropdown').click();
    cy.get('.mantine-Select-item').contains('Yes').click();

    cy.getByTestId('filter-confirm-btn').click();

    cy.getByTestId('add-filter-btn').contains('2 filters');
  });

  it('should re-render content on between step click', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    cy.waitForNetworkIdle(500);

    dragAndDrop('sms');

    dragAndDrop('delay');

    dragAndDrop('sms');

    cy.waitForNetworkIdle(500);

    const firstContent = 'first content for sms';
    const lastContent = 'last content for sms';

    cy.clickWorkflowNode(`node-smsSelector`);
    cy.getByTestId('smsNotificationContent').type(firstContent);

    cy.clickWorkflowNode(`node-smsSelector`, true);
    cy.getByTestId('smsNotificationContent').type(lastContent);

    cy.clickWorkflowNode(`node-smsSelector`);
    cy.getByTestId('smsNotificationContent').should('have.text', firstContent);

    cy.clickWorkflowNode(`node-smsSelector`, true);
    cy.getByTestId('smsNotificationContent').should('have.text', lastContent);
  });
});
