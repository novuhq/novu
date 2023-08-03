import { clickWorkflow, dragAndDrop, fillBasicNotificationDetails, goBack } from '.';

describe('Workflow Editor - Drag and Drop', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should drag and drop channel', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    fillBasicNotificationDetails('Test drag and drop channel');
    goBack();
    dragAndDrop('inApp');
    dragAndDrop('inApp');

    cy.getByTestId('node-inAppSelector').last().parent().click();
  });

  it('should not be able to drop when not on last node', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    fillBasicNotificationDetails('Test only drop on last node');
    goBack();
    dragAndDrop('inApp');
    dragAndDrop('email');
    cy.getByTestId('node-emailSelector').should('not.exist');
    cy.get('.react-flow__node').should('have.length', 3);
  });

  it('should add a step with plus button', function () {
    cy.waitLoadTemplatePage(() => {
      cy.visit('/workflows/create');
    });
    fillBasicNotificationDetails('Test Plus Button');
    goBack();
    cy.getByTestId('button-add').click();
    cy.getByTestId('add-sms-node').click();
    cy.get('.react-flow__node').should('have.length', 3);
    cy.get('.react-flow__node').first().should('contain', 'Workflow trigger').next().should('contain', 'SMS');
  });
});
