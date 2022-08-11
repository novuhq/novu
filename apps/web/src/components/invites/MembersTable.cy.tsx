import { MembersTable } from './MembersTable';
import { TestWrapper } from '../../testing';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';

it('should call callbacks when template remove member clicked', function () {
  const onResendInviteMember = cy.spy().as('resendInviteSpy');
  const onRemoveMember = cy.spy().as('removeSpy');
  const anotherMember = { _userId: 2, user: { email: 'another-test@email.com' }, roles: [MemberRoleEnum.ADMIN] };
  const members = [{ _userId: 1, user: { email: 'test@email.com' }, roles: [MemberRoleEnum.ADMIN] }, anotherMember];

  cy.mount(
    <TestWrapper>
      <MembersTable
        members={members}
        currentUser={{ _id: 1 }}
        onRemoveMember={onRemoveMember}
        onResendInviteMember={onResendInviteMember}
      />
    </TestWrapper>
  );

  cy.getByTestId('actions-row-btn').click();
  cy.getByTestId('remove-row-btn').click();
  cy.get('@removeSpy').should('have.been.calledWith', anotherMember);
});

it('should hide remove member button for current user', function () {
  const onResendInviteMember = cy.spy().as('resendInviteSpy');
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
      <MembersTable
        members={members}
        currentUser={{ _id: 1 }}
        onRemoveMember={onRemoveMember}
        onResendInviteMember={onResendInviteMember}
      />
    </TestWrapper>
  );

  cy.get('[data-test-id="member-row-1"').within(() => {
    return cy.get('[data-test-id="actions-row-btn"]').should('not.be.exist');
  });
});

it('should hide remove buttons if missing roles', function () {
  const onResendInviteMember = cy.spy().as('resendInviteSpy');
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
      <MembersTable
        members={members}
        currentUser={{ _id: 1 }}
        onRemoveMember={onRemoveMember}
        onResendInviteMember={onResendInviteMember}
      />
    </TestWrapper>
  );

  cy.get('[data-test-id="actions-row-btn"]').should('not.be.exist');
});

it('should call callbacks when template resend invite member clicked', function () {
  const onResendInviteMember = cy.spy().as('resendInviteSpy');
  const onRemoveMember = cy.spy().as('removeSpy');
  const anotherMember = {
    _userId: 2,
    user: { email: 'another-test@email.com' },
    roles: [MemberRoleEnum.ADMIN],
    memberStatus: MemberStatusEnum.INVITED,
  };
  const members = [{ _userId: 1, user: { email: 'test@email.com' }, roles: [MemberRoleEnum.ADMIN] }, anotherMember];

  cy.mount(
    <TestWrapper>
      <MembersTable
        members={members}
        currentUser={{ _id: 1 }}
        onRemoveMember={onRemoveMember}
        onResendInviteMember={onResendInviteMember}
      />
    </TestWrapper>
  );

  cy.getByTestId('actions-row-btn').click();
  cy.getByTestId('resend-invite-btn').click();
  cy.get('@resendInviteSpy').should('have.been.calledWith', anotherMember);
});

it('should hide resend invite member when member is already active clicked', function () {
  const onResendInviteMember = cy.spy().as('resendInviteSpy');
  const onRemoveMember = cy.spy().as('removeSpy');
  const anotherMember = {
    _userId: 2,
    user: { email: 'another-test@email.com' },
    roles: [MemberRoleEnum.ADMIN],
    memberStatus: MemberStatusEnum.ACTIVE,
  };
  const members = [{ _userId: 1, user: { email: 'test@email.com' }, roles: [MemberRoleEnum.ADMIN] }, anotherMember];

  cy.mount(
    <TestWrapper>
      <MembersTable
        members={members}
        currentUser={{ _id: 1 }}
        onRemoveMember={onRemoveMember}
        onResendInviteMember={onResendInviteMember}
      />
    </TestWrapper>
  );

  cy.getByTestId('actions-row-btn').click();
  cy.getByTestId('resend-invite-btn').should('not.be.exist');
});
