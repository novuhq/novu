import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrganizationSelect from './OrganizationSelect';
import { TestWrapper } from '../../../testing';

describe('Organization Select Component Test', () => {
  const organizationSelectComponentSelector = '[data-test-id="organization-switch"]';
  const queryClient = new QueryClient();

  it('should Render the Organization Select Component', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.get(organizationSelectComponentSelector).should('exist');
  });

  it('should get the organization-switch data test id', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.get(organizationSelectComponentSelector).should('have.attr', 'data-test-id', 'organization-switch');
  });

  it('should show "Nothing found" if no organization is present inside organization select', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.get(organizationSelectComponentSelector).click();
    cy.contains('Nothing Found', { matchCase: false }).should('exist');
  });

  it('should show Add "Name of the organization" when inserting a new organization', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.get(organizationSelectComponentSelector).type('Lorem ipsum');
    cy.contains('+ Add "Lorem ipsum"', { matchCase: false }).should('exist');
  });

  it('should fill the selected organization based on an input value provided as a prop', () => {
    const selectedOrgId = 'org-1';
    const organizations = [
      { _id: 'org-1', name: 'Organization 1' },
      { _id: 'org-2', name: 'Organization 2' },
      { _id: 'org-3', name: 'Organization 3' },
    ];
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );

    cy.get(organizationSelectComponentSelector).should('exist').invoke('prop', 'value', selectedOrgId);

    const selectedOrg = organizations.find((org) => org._id === selectedOrgId);

    cy.get(organizationSelectComponentSelector).should('exist').invoke('prop', 'value', selectedOrg?.name);

    cy.get(organizationSelectComponentSelector).invoke('val').should('eq', selectedOrg?.name);
    cy.get(organizationSelectComponentSelector).should('have.value', selectedOrg?.name);
  });
});
