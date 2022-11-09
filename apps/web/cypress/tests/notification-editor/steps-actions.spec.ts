import { clickWorkflow, dragAndDrop, editChannel, waitLoadEnv, waitLoadTemplatePage } from '.';

describe('Workflow Editor - Steps Actions', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should be able to delete a step', function () {
    const template = this.session.templates[0];

    cy.visit('/templates/edit/' + template._id);

    waitLoadEnv(() => {
      clickWorkflow();
    });

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

    cy.visit('/templates/edit/' + template._id);
    waitLoadEnv(() => {
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
    waitLoadEnv(() => {
      clickWorkflow();
    });

    dragAndDrop('sms');

    editChannel('sms');
    cy.getByTestId('smsNotificationContent').type('new content for sms');
    cy.getByTestId('submit-btn').click();

    cy.visit('/templates/edit/' + template._id);

    waitLoadEnv(() => {
      clickWorkflow();
    });

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

    waitLoadEnv(() => {
      clickWorkflow();
    });

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
