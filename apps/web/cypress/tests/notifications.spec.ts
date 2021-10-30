describe('Notification Templates Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display notification templates list', function () {
    cy.visit('/templates');
    cy.getByTestId('notifications-template')
      .find('tbody tr')
      .first()
      .getByTestId('template-edit-link')
      .then((a: any) => {
        const found = this.session.templates.find((i) => a.attr('href').includes(i._id));
        expect(found).to.be.ok;
        return expect(a.attr('href')).to.equal(`/templates/edit/${found._id}`);
      });

    cy.getByTestId('notifications-template')
      .find('tbody tr')
      .first()
      .getByTestId('active-status-label')
      .should('be.visible');

    cy.getByTestId('create-template-btn').should('have.attr', 'href', '/templates/create');
    cy.getByTestId('category-label').contains('General');
  });
});
