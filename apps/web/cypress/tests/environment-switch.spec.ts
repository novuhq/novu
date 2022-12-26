describe('Environment Switch Control', function () {
  const modes = ['Development', 'Production'];

  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/');
  });

  it('should display switch when page is loaded', function () {
    cy.getByTestId('environment-switch').find('label').contains(modes[0]);
    cy.getByTestId('environment-switch').find('label').contains(modes[1]);
  });

  it('should use different jwt token after switches', function () {
    const originToken = this.session.token;

    cy.getByTestId('environment-switch')
      .find('.mantine-SegmentedControl-controlActive')
      .then((dom) => {
        if (dom.find('input').prop('value') === modes[0]) {
          cy.getByTestId('environment-switch').find(`input[value="${modes[1]}"]`).click({ force: true });
        } else {
          cy.getByTestId('environment-switch').find(`input[value="${modes[0]}"]`).click({ force: true });
        }

        cy.getByTestId('environment-switch-loading-overlay')
          .should('not.exist')
          .then(() => {
            cy.task('getSession', {}).then((response: any) => {
              expect(response.token).not.to.equal(originToken);
            });
          });
      });
  });

  it('should display loading indicator when switches', function () {
    cy.getByTestId('environment-switch').find('.mantine-SegmentedControl-controlActive');
    cy.getByTestId('environment-switch').find(`input[value="${modes[1]}"]`).click({ force: true });
    cy.getByTestId('environment-switch-loading-overlay').should('not.exist');
  });
});
