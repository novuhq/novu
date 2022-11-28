import { clickWorkflow, dragAndDrop, fillBasicNotificationDetails } from '.';

describe('Workflow Editor - Drag and Drop', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should drag and drop channel', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/templates/create');
    });
    fillBasicNotificationDetails('Test drag and drop channel');
    clickWorkflow();
    dragAndDrop('inApp');
    dragAndDrop('inApp');

    cy.getByTestId('node-inAppSelector').last().parent().click();
    cy.getByTestId('edit-template-channel').click();
  });

  it('should not be able to drop when not on last node', function () {
    cy.waitLoadTemplatePage(() => {
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
    cy.waitLoadTemplatePage(() => {
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
    cy.waitLoadTemplatePage(() => {
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
