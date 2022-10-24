import { QueryClient, QueryClientProvider } from 'react-query';
import OrganizationSelect from './OrganizationSelect';
import { TestWrapper } from '../../../testing';
import { Select } from '../../../design-system';

describe('Organization Select Component Test', () => {
  // Get the locator
  const organizationSelectComponentSelector = '[data-test-id="organization-switch"]';
  const queryClient = new QueryClient();

  // TEST 1
  it('should Render the Organization Select Component', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
  });

  // TEST 2
  it('should get the organization-switch data test id', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
  });

  // TEST 3
  it('should show "Nothing found" if no organization is present inside organization select"', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.get(organizationSelectComponentSelector).click();
    cy.contains('Nothing Found', { matchCase: false });
  });

  // TEST 4
  it('should show Add "Name of the organization" when inserting a new organization', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.get(organizationSelectComponentSelector).type('Lorem ipsum');
    cy.contains('+ Add "Lorem ipsum"', { matchCase: false });
  });
});
