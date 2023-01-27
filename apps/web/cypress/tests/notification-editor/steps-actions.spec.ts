import { clickWorkflow, dragAndDrop, editChannel } from '.';

describe('Workflow Editor - Steps Actions', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should be able to delete a step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    clickWorkflow();

    cy.get('.react-flow__node').should('have.length', 4);
    cy.getByTestId('step-actions-dropdown').first().click().getByTestId('delete-step-action').click();
    cy.get('.mantine-Modal-modal button').contains('Yes').click();
    cy.getByTestId(`node-inAppSelector`).should('not.exist');
    cy.get('.react-flow__node').should('have.length', 3);
    cy.get('.react-flow__node').first().should('contain', 'Trigger').next().should('contain', 'Email');
    cy.getByTestId('submit-btn').click();

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

    clickWorkflow();

    cy.get('.react-flow__node').should('have.length', 3);
  });

  it('should show add step in sidebar after delete', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    cy.waitLoadEnv(() => {
      clickWorkflow();
    });

    cy.get('.react-flow__node').should('have.length', 4);
    cy.getByTestId('step-actions-dropdown').first().click().getByTestId('delete-step-action').click();
    cy.get('.mantine-Modal-modal button').contains('Yes').click();
    cy.getByTestId(`node-inAppSelector`).should('not.exist');
    cy.get('.react-flow__node').should('have.length', 3);
    cy.getByTestId('drag-side-menu').contains('Steps to add');
  });

  it('should keep steps order on reload', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);
    clickWorkflow();

    dragAndDrop('sms');

    editChannel('sms');
    cy.getByTestId('smsNotificationContent').type('new content for sms');
    cy.getByTestId('submit-btn').click();

    cy.visit('/templates/edit/' + template._id);
    cy.waitForNetworkIdle(500);

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

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-active-switch`).get('label').contains('Step is active');
    cy.getByTestId(`step-active-switch`).click({ force: true });
    cy.getByTestId('submit-btn').click();

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-active-switch`).get('label').contains('Step is not active');
  });

  it('should be able to toggle ShouldStopOnFailSwitch', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-should-stop-on-fail-switch`).get('label').contains('Stop workflow if this step fails?');
    cy.getByTestId(`step-should-stop-on-fail-switch`).click({ force: true });
    cy.getByTestId('submit-btn').click();

    cy.clickWorkflowNode(`node-inAppSelector`);
    cy.getByTestId(`step-should-stop-on-fail-switch`).should('be.checked');
  });

  it('should be able to add filters to a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

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

    cy.get('.filter-item').should('have.length', 1);

    cy.get('.filter-item').contains('subscriber filter-key equal');
    cy.get('.filter-item-value').contains('filter-value');
  });

  it('should be able to remove filters for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

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

    cy.get('.filter-item').should('have.length', 1);

    cy.get('.filter-item').contains('payload filter-key equal');
    cy.get('.filter-item-value').contains('filter-value');

    cy.getByTestId('add-filter-btn').click();
    cy.getByTestId('filter-remove-btn').click();
    cy.getByTestId('filter-confirm-btn').click();

    cy.get('.filter-item').should('have.length', 0);
  });

  it('should be able to add webhook filter for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

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

    cy.get('.filter-item').should('have.length', 1);
    cy.get('.filter-item').contains('webhook filter-key equal');
    cy.get('.filter-item-value').contains('filter-value');
  });

  it('should be able to add online right now filter for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

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

    cy.get('.filter-item').should('have.length', 1);
    cy.get('.filter-item').contains('is online right now equal');
    cy.get('.filter-item-value').contains('Yes');
  });

  it('should be able to add online in the last X time period filter for a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

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

    cy.get('.filter-item').should('have.length', 1);
    cy.get('.filter-item').contains('online in the last "X" hours');
    cy.get('.filter-item-value').contains('1');
  });

  it('should be able to add multiple filters to a particular step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    cy.waitForNetworkIdle(500);

    clickWorkflow();

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

    cy.get('.filter-item').should('have.length', 2);

    cy.get('.filter-item').contains('subscriber filter-key equal');
    cy.get('.filter-item-value').contains('filter-value');
  });
});
