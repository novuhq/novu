describe('App Branding', function () {
  beforeEach(function () {
    cy.initializeSession()
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        return cy
          .task('createNotifications', {
            identifier: session.templates[0].triggers[0].identifier,
            token: session.token,
            userId: session.subscriber.$user_id,
            count: 5,
          })
          .then(() => {
            return cy.initializeWidget(session);
          });
      });
  });

  it('change main theme color', function () {
    cy.getByTestId('notification-list-item').then(($els) => {
      // get Window reference from element
      const win = $els[0].ownerDocument.defaultView;
      const before = win.getComputedStyle($els[0], 'before');
      const contentValue = before.getPropertyValue('background-color');

      expect(contentValue).to.eq('rgb(42, 157, 143)');
    });

    // colors convert to rgb for some reason
    cy.getByTestId('notification-list-item').first().should('have.css', 'color', 'rgb(33, 78, 73)');
    cy.getByTestId('main-wrapper').first().should('have.css', 'background-color', 'rgb(194, 203, 210)');
    cy.get('body').first().should('have.css', 'font-family', 'Montserrat, Helvetica, sans-serif');
  });
});
