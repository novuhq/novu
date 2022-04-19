import { interceptIndefinitely } from '../support/utils';

describe('Environment Switch Control', function () {
  const modes = ['Development', 'Production'];

  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display switch when page is loaded', function () {
    cy.visit('/templates');

    cy.getByTestId('environment-switch').find('label').contains(modes[0]);
    cy.getByTestId('environment-switch').find('label').contains(modes[1]);
  });

  it('should display loading indicator when switches', function () {
    const interception = interceptIndefinitely('data-url');

    cy.getByTestId('environment-switch').find('.mantine-SegmentedControl-controlActive').then((dom) => {
      if (dom.find('input').prop('value') === modes[0]) {
        cy.getByTestId('environment-switch').find(`input[value="${modes[1]}"]`).click({force: true});
        cy.getByTestId('environment-switch-loading-overlay').should('be.visible').then(() => {
          interception.sendResponse();
          
          cy.getByTestId('environment-switch').find('.mantine-SegmentedControl-controlActive').contains(modes[1]);
        });
      } else {
        cy.getByTestId('environment-switch').find(`input[value="${modes[0]}"]`).click({force: true});
        cy.getByTestId('environment-switch-loading-overlay').should('be.visible').then(() => {
          interception.sendResponse();
          
          cy.getByTestId('environment-switch').find('.mantine-SegmentedControl-controlActive').contains(modes[0]);
        });
      }
    }); 
  });
});
