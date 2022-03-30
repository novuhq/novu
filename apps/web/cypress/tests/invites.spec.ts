import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';

describe('Invites module', function () {
  beforeEach(function () {
    cy.task('clearDatabase');
    cy.initializeSession()
      .then((session) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/v1/invites`,
          body: {
            email: 'testing-amazing@user.com',
            role: MemberRoleEnum.ADMIN,
          },
          auth: {
            bearer: session.token,
          },
        });
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/v1/organizations/members`,
          auth: {
            bearer: session.token,
          },
        })
          .then((response) => {
            const member = response.body.data.find((i) => i.memberStatus === MemberStatusEnum.INVITED);
            return member.invite.token;
          })
          .as('token');

        cy.logout();
      })
      .as('session');
  });

  it('should accept invite to organization', function () {
    cy.visit('/auth/invitation/' + this.token);
    cy.getByTestId('fullName').type('Invited to org user');
    cy.getByTestId('password').type('asd#Faf4fd');
    cy.getByTestId('submitButton').click();
  });
});
