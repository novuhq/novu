describe('Subscribers Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display subscribers list', function () {
    cy.visit('/subscribers');

    cy.getByTestId('subscribers-table')
      .find('th:nth-child(1)')
      .each((el) => {
        expect(el.text()).equal('Subscriber identifier');
      });

    cy.getByTestId('subscribers-table')
      .find('th:nth-child(3)')
      .each((el) => {
        expect(el.text()).equal('Last Name');
      });
  });
});
