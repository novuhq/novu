describe('App Branding', function () {
  beforeEach(function () {
    cy.intercept('**/widgets/organization').as('organizationSettings');

    cy.initializeSession()
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        return cy.task('createNotifications', {
          identifier: session.templates[0].triggers[0].identifier,
          token: session.token,
          subscriberId: session.subscriber.subscriberId,
          count: 5,
        });
      });
  });

  /**
   * For now, user's branding will only include font family, layout direction and brand color.
   */
  it('change main theme color', function () {
    cy.wait('@organizationSettings');
    cy.wait(1000);

    cy.getByTestId('notification-list-item').then(($els) => {
      // get Window reference from element
      const win = $els[0].ownerDocument.defaultView;
      const before = win.getComputedStyle($els[0], 'before');
      const contentValueColor = before.getPropertyValue('background-color');
      const contentValueImage = before.getPropertyValue('background-image');

      expect(contentValueColor).to.eq('rgba(0, 0, 0, 0)');
      expect(contentValueImage).to.eq('linear-gradient(0deg, rgb(255, 81, 47) 0%, rgb(221, 36, 118) 100%)');
    });

    cy.get('body').first().should('have.css', 'font-family', 'Lato, Helvetica, sans-serif');
  });
});

describe('App custom theme', function () {
  beforeEach(function () {
    cy.intercept('**/widgets/organization').as('organizationSettings');

    const theme = {
      light: {
        layout: {
          background: 'red',
        },
      },
    };

    cy.initializeSession({ theme })
      .as('session')
      .then((session: any) => {
        cy.wait(500);

        return cy.task('createNotifications', {
          identifier: session.templates[0].triggers[0].identifier,
          token: session.token,
          subscriberId: session.subscriber.subscriberId,
          count: 5,
        });
      });
  });

  it('should have branding applied', function () {
    cy.wait('@organizationSettings');
    cy.wait(1000);

    cy.getByTestId('layout-wrapper').should(
      'have.css',
      'background',
      'rgb(255, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box'
    );
  });
});
