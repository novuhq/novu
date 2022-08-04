import { MembersTable } from './MembersTable';
import { TestWrapper } from '../../testing';
import { MemberRoleEnum } from '@novu/shared';

it('should call callbacks when template remove member clicked', function () {
  const onRemoveMember = cy.spy().as('removeSpy');
  const anotherMember = { _userId: 2, user: { email: 'another-test@email.com' }, roles: [MemberRoleEnum.ADMIN] };
  const members = [{ _userId: 1, user: { email: 'test@email.com' }, roles: [MemberRoleEnum.ADMIN] }, anotherMember];

  cy.mount(
    <TestWrapper>
      <MembersTable members={members} currentUser={{ _id: 1 }} onRemoveMember={onRemoveMember} />
    </TestWrapper>
  );

  cy.getByTestId('actions-row-btn').click();
  cy.getByTestId('remove-row-btn').click();
  cy.get('@removeSpy').should('have.been.calledWith', anotherMember);
});

it('should hide remove member button for current user', function () {
  const onRemoveMember = cy.spy().as('removeSpy');
  const anotherMember = {
    _id: 2,
    _userId: 2,
    user: { email: 'another-test@email.com' },
    roles: [MemberRoleEnum.ADMIN],
  };

  const members = [
    { _id: 1, _userId: 1, user: { email: 'test@email.com' }, roles: [MemberRoleEnum.ADMIN] },
    anotherMember,
  ];

  cy.mount(
    <TestWrapper>
      <MembersTable members={members} currentUser={{ _id: 1 }} onRemoveMember={onRemoveMember} />
    </TestWrapper>
  );

  cy.get('[data-test-id="member-row-1"').within(() => {
    return cy.get('[data-test-id="actions-row-btn"]').should('not.be.exist');
  });
});

it('should hide remove buttons if missing roles', function () {
  const onRemoveMember = cy.spy().as('removeSpy');
  const anotherMember = {
    _id: 2,
    _userId: 2,
    user: { email: 'another-test@email.com' },
    roles: [MemberRoleEnum.ADMIN],
  };

  const members = [
    { _id: 1, _userId: 1, user: { email: 'test@email.com' }, roles: [MemberRoleEnum.MEMBER] },
    anotherMember,
  ];

  cy.mount(
    <TestWrapper>
      <MembersTable members={members} currentUser={{ _id: 1 }} onRemoveMember={onRemoveMember} />
    </TestWrapper>
  );

  cy.get('[data-test-id="actions-row-btn"]').should('not.be.exist');
});
